#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const task = JSON.parse(fs.readFileSync(path.join(root, 'evals/tasks/flask-teardown-errors/task.json'), 'utf8'));
const image = 'keelson-bench-codex-isolation:0.155.1';
const supplemental = path.join(root, 'evals/supplemental/test_teardown_contract.py');
const packages = ['pytest', 'iniconfig', 'packaging', 'pluggy', 'pygments', 'asgiref', 'python-dotenv', 'greenlet', 'blinker', 'click', 'itsdangerous', 'jinja2', 'markupsafe', 'werkzeug'];

function run(command, args, cwd, timeout = 600000) {
  const started = Date.now();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  return { command: [command, ...args], cwd, exit_code: result.status ?? (result.signal ? 124 : 1), signal: result.signal ?? null, error: result.error?.message ?? null, elapsed_ms: Date.now() - started, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function writeRecord(dir, name, record) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.stdout.log`), record.stdout);
  fs.writeFileSync(path.join(dir, `${name}.stderr.log`), record.stderr);
  fs.writeFileSync(path.join(dir, `${name}.command.json`), `${JSON.stringify({ ...record, stdout: undefined, stderr: undefined }, null, 2)}\n`);
}

function docker(worktree, args, timeout) {
  return run('sudo', ['-n', 'docker', 'run', '--rm', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m', '--tmpfs', '/home/node:rw,nosuid,size=32m,uid=1000,gid=1000',
    '--mount', `type=bind,src=${worktree},dst=/workspace`, '--workdir', '/workspace',
    '--env', 'PYTHONPATH=src:.bench-pydeps', image, ...args], worktree, timeout);
}

function lockedRequirements(worktree) {
  const blocks = fs.readFileSync(path.join(worktree, 'uv.lock'), 'utf8').split('[[package]]');
  const versions = new Map(blocks.map((block) => [block.match(/^\s*name = "([^"]+)"/m)?.[1], block.match(/^\s*version = "([^"]+)"/m)?.[1]]).filter(([name, version]) => name && version));
  return packages.filter((name) => versions.has(name)).map((name) => `${name}==${versions.get(name)}`);
}

function checkout(sha, worktree, evidence) {
  const init = run('git', ['init', worktree], path.dirname(worktree), 300000);
  writeRecord(evidence, 'source-init', init);
  if (init.exit_code !== 0) return init;
  const steps = [
    ['source-add-remote', 'git', ['remote', 'add', 'origin', task.repository]],
    ['source-fetch', 'git', ['fetch', '--depth=1', 'origin', sha]],
    ['source-checkout', 'git', ['checkout', '--detach', 'FETCH_HEAD']],
  ];
  for (const [name, command, args] of steps) {
    const record = run(command, args, worktree, 300000);
    writeRecord(evidence, name, record);
    if (record.exit_code !== 0) return record;
  }
  return { exit_code: 0 };
}

function testOne({ sha, patchFile = null, evidence }) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-supplemental-'));
  const worktree = path.join(temp, 'worktree');
  try {
    const source = checkout(sha, worktree, evidence);
    if (source.exit_code !== 0) return { ...source, stage: 'source', environment_valid: false };
    if (patchFile) {
      const patch = fs.readFileSync(patchFile).length
        ? run('git', ['apply', '--whitespace=nowarn', patchFile], worktree, 300000)
        : { command: [], cwd: worktree, exit_code: 0, stdout: 'Empty candidate patch: evaluate the unchanged baseline.\n', stderr: '' };
      writeRecord(evidence, 'apply-final-patch', patch);
      if (patch.exit_code !== 0) return { ...patch, stage: 'apply-patch', environment_valid: false };
    }
    const requirements = lockedRequirements(worktree);
    fs.writeFileSync(path.join(evidence, 'locked-requirements.json'), `${JSON.stringify(requirements, null, 2)}\n`);
    const install = docker(worktree, ['python3', '-m', 'pip', 'install', '--target', '.bench-pydeps', '.', ...requirements], 600000);
    writeRecord(evidence, 'python-install', install);
    if (install.exit_code !== 0) return { ...install, stage: 'dependencies', environment_valid: false };
    fs.mkdirSync(path.join(worktree, '.bench-supplemental'));
    fs.copyFileSync(supplemental, path.join(worktree, '.bench-supplemental/test_teardown_contract.py'));
    const verification = docker(worktree, ['python3', '-m', 'pytest', '.bench-supplemental/test_teardown_contract.py', '-q'], 300000);
    writeRecord(evidence, 'supplemental-verification', verification);
    return { ...verification, stage: 'supplemental-verification', environment_valid: true };
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function requireArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
}

const output = path.resolve(requireArg('--output') ?? path.join(root, 'evals/results/supplemental-d17'));
const mode = process.argv.includes('--preflight') ? 'preflight' : 'replay';
const repetitionStart = Number(requireArg('--repetition-start') ?? 1);
if (!Number.isSafeInteger(repetitionStart) || repetitionStart < 1) throw new Error('--repetition-start must be a positive integer');
if (!fs.existsSync(supplemental)) throw new Error(`missing frozen supplemental test: ${supplemental}`);
if (fs.existsSync(output) && fs.readdirSync(output).length) throw new Error(`refusing to overwrite existing evidence: ${output}`);
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(supplemental, path.join(output, 'test_teardown_contract.py'));
fs.writeFileSync(path.join(output, 'provenance.json'), `${JSON.stringify({ supplemental_source: 'keelson main commit 3246ce4', supplemental_sha256: run('sha256sum', [supplemental], root).stdout.trim().split(/\s+/)[0], task, docker_image: image, mode, repetition_start: repetitionStart }, null, 2)}\n`);

if (mode === 'preflight') {
  const baseline = testOne({ sha: task.baseline_sha, evidence: path.join(output, 'baseline') });
  const oracle = testOne({ sha: task.upstream_fix_sha, evidence: path.join(output, 'oracle') });
  const summary = { baseline_exit_code: baseline.exit_code, oracle_exit_code: oracle.exit_code,
    baseline_stage: baseline.stage, oracle_stage: oracle.stage,
    valid: baseline.environment_valid && oracle.environment_valid && baseline.exit_code === 1 && oracle.exit_code === 0 };
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.valid ? 0 : 1;
} else {
  const roots = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (value === '--output' || value === '--repetition-start') { index += 1; continue; }
    if (value.startsWith('--')) throw new Error(`unknown option: ${value}`);
    roots.push(value);
  }
  if (!roots.length) throw new Error('replay requires one or more formal result roots');
  const rows = [];
  for (const resultRoot of roots) {
    for (const entry of fs.readdirSync(resultRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.includes('flask-teardown-errors__')) continue;
      const original = path.resolve(resultRoot, entry.name);
      const originalSummary = path.join(original, 'summary.json');
      const patchFile = path.join(original, 'final.patch');
      if (!fs.existsSync(originalSummary) || !fs.existsSync(patchFile)) continue;
      const prior = JSON.parse(fs.readFileSync(originalSummary, 'utf8'));
      if (prior.repetition < repetitionStart) continue;
      const evidence = path.join(output, entry.name);
      const patchSha = crypto.createHash('sha256').update(fs.readFileSync(patchFile)).digest('hex');
      const outcome = testOne({ sha: task.baseline_sha, patchFile, evidence });
      rows.push({ original_evidence: original, task: prior.task, method: prior.method, repetition: prior.repetition,
        original_comparison_eligible: prior.comparison_eligible, original_pass: prior.pass, candidate_patch_sha256: patchSha,
        stage: outcome.stage, environment_valid: outcome.environment_valid, supplemental_exit_code: outcome.exit_code,
        pass: outcome.environment_valid && outcome.exit_code === 0 });
      fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify({ complete: false, rows }, null, 2)}\n`);
      console.log(`${entry.name}: ${outcome.stage} exit ${outcome.exit_code}`);
    }
  }
  fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify({ complete: true, rows, all_pass: rows.length > 0 && rows.every((row) => row.pass) }, null, 2)}\n`);
}
