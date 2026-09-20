#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { METHOD_IDS, finalPatch, findUsage, sourcePaths, summarizeRun, validateTask } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const EVALS = path.join(ROOT, 'evals');
const TASKS = path.join(EVALS, 'tasks');
const RESULTS = path.join(EVALS, 'results');
const MODEL_DEFAULT = 'gpt-5.6-terra';
const OPEN_SPEC = { package: '@fission-ai/openspec@1.13.1', integrity: 'sha512-UHJSV2n6ohjfRaJLvi526avOohFS/orCjM+7JPgvDzuEJbCCkykKfP2fp3gcsvthDLeWolMRT5JAE08MSPnr8Q==' };
const TRELLIS = { package: '@mindfoldhq/trellis@0.6.17', integrity: 'sha512-u65OJbzR3OBzFWybX/uzBXaZdzn+71Afaknodu0GUcFIrTyp3ZegK9rHNeTX0guHow35WXkqDVuyrhn8vVzSQg==' };
const SUPERPOWERS_SHA = '5bf4e78011075bcfc0dc295f0724994cd123ee71';
const DOCKER_IMAGE = 'keelson-bench-codex-isolation:0.155.1';
const CODEX_BIN_DIR = '/home/ubuntu/.codex/packages/standalone/releases/0.155.1-x86_64-unknown-linux-musl/bin';
const CODEX_AUTH = '/home/ubuntu/.codex/auth.json';
const CODEX_CREDENTIALS = '/home/ubuntu/.codex/.credentials.json';
const LOCKED_TEST_PACKAGES = [
  'pytest', 'iniconfig', 'packaging', 'pluggy', 'pygments',
  'asgiref', 'python-dotenv', 'greenlet',
  'blinker', 'click', 'itsdangerous', 'jinja2', 'markupsafe', 'werkzeug',
];

function usage() {
  console.log(`Usage: node benchmarks/run.mjs (--matrix | --task ID | --verify-environment | --verify-method ID | --smoke-framework-model ID) [options]

Options:
  --method ID              ${METHOD_IDS.join(', ')}; repeatable (default: bare)
  --model ID               default: ${MODEL_DEFAULT}
  --repetitions N          default: 1
  --repetition-start N     first repetition number (default: 1; supports isolated parallel cells)
  --timeout-minutes N      default: 20 per Codex invocation
  --isolation MODE         docker (default) or host
  --output DIR             default: evals/results/<UTC timestamp>
  --keelson-source DIR     required only with --method keelson; a clean frozen checkout with npm ci completed
  --verify-environment     run public suites on each baseline and upstream fix, without Codex
  --verify-method ID       provision one fresh baseline and verify the treatment runtime, without Codex
  --smoke-framework-model ID  use Codex to exercise a framework CLI in the isolated container, without a task implementation
  --keep-worktrees         retain temporary worktrees for debugging
  --help`);
}

function parseArgs(argv) {
  const options = { methods: [], repetitions: 1, repetitionStart: 1, model: MODEL_DEFAULT, timeoutMinutes: 20, keepWorktrees: false, isolation: 'docker' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--matrix') options.matrix = true;
    else if (arg === '--task') options.task = argv[++i];
    else if (arg === '--method') options.methods.push(argv[++i]);
    else if (arg === '--model') options.model = argv[++i];
    else if (arg === '--repetitions') options.repetitions = Number(argv[++i]);
    else if (arg === '--repetition-start') options.repetitionStart = Number(argv[++i]);
    else if (arg === '--timeout-minutes') options.timeoutMinutes = Number(argv[++i]);
    else if (arg === '--isolation') options.isolation = argv[++i];
    else if (arg === '--output') options.output = argv[++i];
    else if (arg === '--keelson-source') options.keelsonSource = path.resolve(argv[++i]);
    else if (arg === '--keep-worktrees') options.keepWorktrees = true;
    else if (arg === '--verify-environment') options.verifyEnvironment = true;
    else if (arg === '--verify-method') options.verifyMethod = argv[++i];
    else if (arg === '--smoke-framework-model') options.smokeFrameworkModel = argv[++i];
    else if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!options.matrix && !options.task && !options.verifyEnvironment && !options.verifyMethod && !options.smokeFrameworkModel) throw new Error('choose --matrix, --task, --verify-environment, --verify-method, or --smoke-framework-model');
  if (options.matrix && options.task) throw new Error('--matrix and --task are mutually exclusive');
  if (!Number.isInteger(options.repetitions) || options.repetitions < 1) throw new Error('--repetitions must be a positive integer');
  if (!Number.isInteger(options.repetitionStart) || options.repetitionStart < 1) throw new Error('--repetition-start must be a positive integer');
  if (!Number.isFinite(options.timeoutMinutes) || options.timeoutMinutes <= 0) throw new Error('--timeout-minutes must be positive');
  if (!['docker', 'host'].includes(options.isolation)) throw new Error('--isolation must be docker or host');
  options.methods = options.methods.length ? options.methods : (options.matrix ? METHOD_IDS.slice(0, 4) : ['bare']);
  for (const method of options.methods) if (!METHOD_IDS.includes(method)) throw new Error(`unknown method: ${method}`);
  if (options.verifyMethod && !METHOD_IDS.includes(options.verifyMethod)) throw new Error(`unknown --verify-method: ${options.verifyMethod}`);
  if (options.smokeFrameworkModel && !METHOD_IDS.includes(options.smokeFrameworkModel)) throw new Error(`unknown --smoke-framework-model: ${options.smokeFrameworkModel}`);
  if (options.methods.includes('keelson') && !options.keelsonSource) throw new Error('--method keelson requires --keelson-source');
  return options;
}

function text(result) { return result.stdout?.toString() ?? ''; }
function err(result) { return result.stderr?.toString() ?? ''; }

function run(command, args, { cwd, env, timeoutMs = 300000 } = {}) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    command: [command, ...args],
    cwd,
    exit_code: result.status ?? (result.signal ? 124 : 1),
    signal: result.signal ?? null,
    error: result.error?.message ?? null,
    elapsed_ms: Date.now() - started,
    stdout: text(result),
    stderr: err(result),
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeLog(dir, name, record) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.stdout.log`), record.stdout);
  fs.writeFileSync(path.join(dir, `${name}.stderr.log`), record.stderr);
  writeJson(path.join(dir, `${name}.command.json`), {
    command: record.command, cwd: record.cwd, exit_code: record.exit_code,
    signal: record.signal, error: record.error, elapsed_ms: record.elapsed_ms,
  });
}

function git(cwd, args) {
  return run('git', args, { cwd, timeoutMs: 300000 });
}

function checkoutIsolatedBaseline(task, worktree, evidenceDir) {
  const init = run('git', ['init', worktree], { timeoutMs: 300000 });
  writeLog(evidenceDir, 'source-init', init);
  if (init.exit_code !== 0) throw new Error(`could not initialize isolated source: ${init.stderr}`);
  const remoteAdd = git(worktree, ['remote', 'add', 'origin', task.repository]);
  writeLog(evidenceDir, 'source-add-remote', remoteAdd);
  const fetch = git(worktree, ['fetch', '--depth=1', 'origin', task.baseline_sha]);
  writeLog(evidenceDir, 'source-fetch-baseline', fetch);
  const checkout = git(worktree, ['checkout', '--detach', 'FETCH_HEAD']);
  writeLog(evidenceDir, 'checkout', checkout);
  const baselineRef = git(worktree, ['branch', '--force', 'benchmark-baseline', 'HEAD']);
  writeLog(evidenceDir, 'source-create-baseline-ref', baselineRef);
  const remoteRemove = git(worktree, ['remote', 'remove', 'origin']);
  writeLog(evidenceDir, 'source-remove-remote', remoteRemove);
  const garbageCollect = git(worktree, ['gc', '--prune=now']);
  writeLog(evidenceDir, 'source-gc', garbageCollect);
  const inaccessible = git(worktree, ['cat-file', '-e', `${task.upstream_fix_sha}^{commit}`]);
  writeLog(evidenceDir, 'source-check-upstream-inaccessible', inaccessible);
  const remainingRemotes = git(worktree, ['remote']);
  writeLog(evidenceDir, 'source-check-remotes', remainingRemotes);
  const sanitization = {
    fetch_depth: 1,
    fetched_sha: task.baseline_sha,
    baseline_ref: 'refs/heads/benchmark-baseline',
    baseline_ref_exit_code: baselineRef.exit_code,
    remote_remove_exit_code: remoteRemove.exit_code,
    gc_exit_code: garbageCollect.exit_code,
    upstream_fix_object_inaccessible: inaccessible.exit_code !== 0,
    remaining_remotes: remainingRemotes.stdout.split('\n').filter(Boolean),
  };
  writeJson(path.join(evidenceDir, 'source-sanitization.json'), sanitization);
  if (fetch.exit_code !== 0 || checkout.exit_code !== 0 || baselineRef.exit_code !== 0
    || remoteRemove.exit_code !== 0 || garbageCollect.exit_code !== 0
    || !sanitization.upstream_fix_object_inaccessible || sanitization.remaining_remotes.length) {
    throw new Error('could not create an isolated baseline without the upstream fix object');
  }
  return checkout;
}

function taskIds() {
  return fs.readdirSync(TASKS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function loadTask(id) {
  const dir = path.join(TASKS, id);
  const task = validateTask(JSON.parse(fs.readFileSync(path.join(dir, 'task.json'), 'utf8')));
  return { ...task, dir, prompt: fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8') };
}

function changedPaths(worktree, excludedPaths = []) {
  const tracked = git(worktree, ['diff', '--name-only', '--no-ext-diff', 'benchmark-baseline']);
  if (tracked.exit_code !== 0) throw new Error(`could not inspect baseline diff: ${tracked.stderr}`);
  const untracked = git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (untracked.exit_code !== 0) throw new Error(`could not inspect untracked paths: ${untracked.stderr}`);
  const excluded = new Set(excludedPaths);
  return [...new Set([
    ...tracked.stdout.split('\n').filter(Boolean),
    ...untracked.stdout.split('\0').filter(Boolean),
  ].filter((entry) => !entry.startsWith('.bench-') && !excluded.has(entry)))].sort();
}

function setupFootprint(worktree, paths) {
  let bytes = 0;
  let lines = 0;
  for (const relative of paths) {
    const absolute = path.join(worktree, relative);
    try {
      const stat = fs.lstatSync(absolute);
      if (!stat.isFile()) continue;
      bytes += stat.size;
      lines += fs.readFileSync(absolute, 'utf8').split('\n').length - 1;
    } catch { /* setup evidence remains authoritative */ }
  }
  return { paths, file_count: paths.length, bytes, lines, top_level_paths: [...new Set(paths.map((entry) => entry.split('/')[0]))].sort() };
}

function codexVersion() {
  return run('codex', ['--version']).stdout.trim();
}

function commandAvailable(command) {
  return run('sh', ['-lc', `command -v ${command}`]).exit_code === 0;
}

function dockerAvailable() {
  const record = run('sudo', ['-n', 'docker', 'image', 'inspect', DOCKER_IMAGE]);
  return record.exit_code === 0;
}

function dockerCommand(worktree, commandArgs, timeoutMs, { auth = false, frameworkRuntime = null, env = [] } = {}) {
  const mounts = [
    '--mount', `type=bind,src=${worktree},dst=/workspace`,
  ];
  if (frameworkRuntime?.kind === 'keelson') mounts.push('--mount', `type=bind,src=${frameworkRuntime.source},dst=/opt/keelson,readonly`);
  if (frameworkRuntime?.kind === 'openspec') mounts.push(
    '--mount', `type=bind,src=${frameworkRuntime.source},dst=/opt/openspec,readonly`,
    '--mount', `type=bind,src=${frameworkRuntime.wrapper},dst=/usr/local/bin/openspec,readonly`,
  );
  if (auth) mounts.push(
    '--mount', `type=bind,src=${path.join(CODEX_BIN_DIR, 'codex')},dst=/opt/codex/codex,readonly`,
    '--mount', `type=bind,src=${path.join(CODEX_BIN_DIR, 'codex-code-mode-host')},dst=/opt/codex/codex-code-mode-host,readonly`,
    '--mount', `type=bind,src=${CODEX_AUTH},dst=/run/codex-auth.json,readonly`,
    '--mount', `type=bind,src=${CODEX_CREDENTIALS},dst=/run/codex-credentials.json,readonly`,
  );
  const args = ['-n', 'docker', 'run', '--rm', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m', '--tmpfs', '/home/node:rw,nosuid,size=32m,uid=1000,gid=1000',
    ...mounts, '--workdir', '/workspace',
    '--env', 'GIT_CONFIG_COUNT=1', '--env', 'GIT_CONFIG_KEY_0=safe.directory', '--env', 'GIT_CONFIG_VALUE_0=/workspace',
    ...env.flatMap((value) => ['--env', value]), DOCKER_IMAGE, ...commandArgs];
  return run('sudo', args, { cwd: worktree, timeoutMs });
}

function dockerCodex(worktree, codexArgs, timeoutMs, frameworkRuntime) {
  if (!fs.existsSync(CODEX_BIN_DIR) || !fs.existsSync(CODEX_AUTH) || !fs.existsSync(CODEX_CREDENTIALS)) {
    return { command: [], cwd: worktree, exit_code: 125, signal: null, error: 'Codex binary or minimal auth files missing', elapsed_ms: 0, stdout: '', stderr: '' };
  }
  return dockerCommand(worktree, ['sh', '-c',
    'mkdir -p /home/node/.codex && cp /run/codex-auth.json /home/node/.codex/auth.json && cp /run/codex-credentials.json /home/node/.codex/.credentials.json && exec /opt/codex/codex "$@"',
    'codex-wrapper', ...codexArgs], timeoutMs, {
    auth: true,
    frameworkRuntime,
    env: frameworkRuntime?.kind === 'keelson'
      ? ['PATH=/opt/keelson/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']
      : frameworkRuntime?.kind === 'openspec'
        ? ['PATH=/opt/openspec/node_modules/.bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin']
        : [],
  });
}

function keelsonSnapshot(source) {
  const head = git(source, ['rev-parse', 'HEAD']);
  const status = git(source, ['status', '--porcelain']);
  const executable = path.join(source, 'bin', 'keelson.js');
  if (head.exit_code !== 0 || status.exit_code !== 0 || !fs.existsSync(executable)) {
    throw new Error(`invalid Keelson source: ${source}`);
  }
  return {
    source,
    head: head.stdout.trim(),
    clean: status.stdout.trim() === '',
    executable,
    package_lock_sha256: fs.existsSync(path.join(source, 'package-lock.json'))
      ? run('sha256sum', [path.join(source, 'package-lock.json')]).stdout.trim().split(/\s+/)[0]
      : null,
  };
}

function lockedTestRequirements(worktree) {
  const lockFile = path.join(worktree, 'uv.lock');
  if (!fs.existsSync(lockFile)) throw new Error('task baseline does not contain uv.lock');
  const blocks = fs.readFileSync(lockFile, 'utf8').split('[[package]]');
  const versions = new Map();
  for (const block of blocks) {
    const name = block.match(/^\s*name = "([^"]+)"/m)?.[1];
    const version = block.match(/^\s*version = "([^"]+)"/m)?.[1];
    if (name && version) versions.set(name, version);
  }
  const requirements = LOCKED_TEST_PACKAGES
    .filter((name) => versions.has(name))
    .map((name) => `${name}==${versions.get(name)}`);
  if (!requirements.some((value) => value.startsWith('pytest=='))) throw new Error('uv.lock lacks pytest');
  return {
    lock_sha256: run('sha256sum', [lockFile]).stdout.trim().split(/\s+/)[0],
    packages: requirements,
  };
}

function pythonSetup(worktree, evidenceDir, options) {
  const locked = lockedTestRequirements(worktree);
  writeJson(path.join(evidenceDir, 'python-locked-requirements.json'), locked);
  if (options.isolation === 'docker') {
    const pip = dockerCommand(worktree, ['python3', '-m', 'pip', '--version'], 120000);
    writeLog(evidenceDir, 'python-pip', pip);
    if (pip.exit_code !== 0) return { ...pip, python: 'python3', env: { PYTHONPATH: 'src:.bench-pydeps' } };
    const install = dockerCommand(worktree, ['python3', '-m', 'pip', 'install', '--target', '.bench-pydeps', '.', ...locked.packages], 600000);
    writeLog(evidenceDir, 'python-install', install);
    const testEnv = { PYTHONPATH: 'src:.bench-pydeps' };
    if (install.exit_code === 0) {
      const freeze = dockerCommand(worktree, ['python3', '-m', 'pip', 'freeze', '--path', '.bench-pydeps'], 120000);
      writeLog(evidenceDir, 'python-freeze', freeze);
    }
    return { ...install, python: 'python3', env: testEnv };
  }
  const create = run('python3', ['-m', 'venv', '.bench-venv'], { cwd: worktree, timeoutMs: 120000 });
  writeLog(evidenceDir, 'python-venv', create);
  if (create.exit_code === 0) {
    const install = run('.bench-venv/bin/python', ['-m', 'pip', 'install', '-e', '.', ...locked.packages], { cwd: worktree, timeoutMs: 600000 });
    writeLog(evidenceDir, 'python-install', install);
    if (install.exit_code === 0) {
      const freeze = run('.bench-venv/bin/python', ['-m', 'pip', 'freeze'], { cwd: worktree });
      writeLog(evidenceDir, 'python-freeze', freeze);
    }
    return { ...install, python: '.bench-venv/bin/python', env: {} };
  }

  // The minimal runner image lacks Debian's python3-venv package. Bootstrap
  // pip inside this disposable worktree rather than changing the host image.
  const installer = path.join(worktree, '.bench-get-pip.py');
  const download = run('curl', ['--fail', '--location', '--silent', '--show-error', 'https://bootstrap.pypa.io/get-pip.py', '--output', installer], { cwd: worktree, timeoutMs: 120000 });
  writeLog(evidenceDir, 'python-get-pip-download', download);
  if (download.exit_code !== 0) return { ...download, python: 'python3', env: {} };
  const hash = run('sha256sum', [installer], { cwd: worktree });
  writeLog(evidenceDir, 'python-get-pip-sha256', hash);
  const bootEnv = { PYTHONPATH: '.bench-pydeps' };
  const bootstrap = run('python3', ['.bench-get-pip.py', '--target', '.bench-pydeps'], { cwd: worktree, env: bootEnv, timeoutMs: 300000 });
  writeLog(evidenceDir, 'python-get-pip-bootstrap', bootstrap);
  if (bootstrap.exit_code !== 0) return { ...bootstrap, python: 'python3', env: bootEnv };
  const install = run('python3', ['-m', 'pip', 'install', '--target', '.bench-pydeps', '.', ...locked.packages], { cwd: worktree, env: bootEnv, timeoutMs: 600000 });
  writeLog(evidenceDir, 'python-install', install);
  const testEnv = { PYTHONPATH: 'src:.bench-pydeps' };
  if (install.exit_code === 0) {
    const freeze = run('python3', ['-m', 'pip', 'freeze'], { cwd: worktree, env: bootEnv });
    writeLog(evidenceDir, 'python-freeze', freeze);
  }
  return { ...install, python: 'python3', env: testEnv };
}

function openspecRuntime(tempRoot, worktree, evidenceDir) {
  const source = path.join(tempRoot, 'openspec-runtime');
  // Docker executes as uid 1000. mkdtemp creates a 0700 parent, so make only
  // this disposable, read-only-mounted package tree traversable by that uid.
  fs.chmodSync(tempRoot, 0o755);
  const npmCache = path.join(tempRoot, 'npm-cache');
  const npmEnv = { npm_config_cache: npmCache, CI: 'true', NO_COLOR: '1' };
  const install = run('npm', ['install', '--prefix', source, '--omit=dev', '--no-audit', '--no-fund', '--save-exact', OPEN_SPEC.package], { cwd: worktree, env: npmEnv, timeoutMs: 600000 });
  if (fs.existsSync(source)) fs.chmodSync(source, 0o755);
  const wrapper = path.join(source, 'openspec-wrapper');
  if (install.exit_code === 0) {
    fs.writeFileSync(wrapper, '#!/bin/sh\nexec node /opt/openspec/node_modules/@fission-ai/openspec/bin/openspec.js "$@"\n', { mode: 0o755 });
  }
  writeLog(evidenceDir, 'openspec-runtime-install', install);
  const lock = path.join(source, 'package-lock.json');
  let integrity = null;
  try { integrity = JSON.parse(fs.readFileSync(lock, 'utf8')).packages?.['node_modules/@fission-ai/openspec']?.integrity ?? null; } catch { /* install record is authoritative */ }
  const runtime = { kind: 'openspec', source, wrapper, package: OPEN_SPEC.package, expected_integrity: OPEN_SPEC.integrity, installed_integrity: integrity };
  const smoke = install.exit_code === 0
    ? dockerCommand(worktree, ['/bin/bash', '-lc', 'command -v openspec && openspec --version && openspec --help'], 300000, { frameworkRuntime: runtime, env: ['PATH=/opt/openspec/node_modules/.bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'] })
    : install;
  writeLog(evidenceDir, 'openspec-container-smoke', smoke);
  writeJson(path.join(evidenceDir, 'openspec-runtime.json'), { ...runtime, smoke_exit_code: smoke.exit_code });
  return { runtime, record: smoke.exit_code === 0 && integrity === OPEN_SPEC.integrity ? smoke : { ...smoke, exit_code: smoke.exit_code || 125, stderr: `${smoke.stderr}\nOpenSpec integrity mismatch: ${integrity ?? 'missing'}` } };
}

function methodSetup(method, worktree, evidenceDir, tempRoot, options) {
  const npmCache = path.join(tempRoot, 'npm-cache');
  const npmEnv = { npm_config_cache: npmCache, CI: 'true', NO_COLOR: '1' };
  let record;
  if (method === 'bare') {
    record = { command: [], cwd: worktree, exit_code: 0, signal: null, error: null, elapsed_ms: 0, stdout: 'No method artifacts installed.\n', stderr: '' };
  } else if (method === 'openspec') {
    const provisioned = openspecRuntime(tempRoot, worktree, evidenceDir);
    const initialized = provisioned.record.exit_code === 0
      ? run('npx', ['--yes', '--package', OPEN_SPEC.package, 'openspec', 'init', '--tools', 'codex', '--profile', 'core', '--force', '--no-animation', '--no-copilot-cloud'], { cwd: worktree, env: npmEnv, timeoutMs: 600000 })
      : provisioned.record;
    record = { ...initialized, frameworkRuntime: provisioned.runtime };
  } else if (method === 'trellis') {
    record = run('npx', ['--yes', '--package', TRELLIS.package, 'trellis', 'init', '--codex', '--yes', '--user', 'benchmark', '--force', '--no-monorepo'], { cwd: worktree, env: npmEnv, timeoutMs: 600000 });
  } else if (method === 'superpowers') {
    const source = path.join(tempRoot, 'superpowers');
    const clone = run('git', ['clone', 'https://github.com/obra/superpowers.git', source], { timeoutMs: 600000 });
    writeLog(evidenceDir, 'superpowers-clone', clone);
    const checkout = clone.exit_code === 0 ? run('git', ['checkout', '--detach', SUPERPOWERS_SHA], { cwd: source }) : clone;
    if (clone.exit_code === 0) writeLog(evidenceDir, 'superpowers-checkout', checkout);
    if (checkout.exit_code === 0) {
      const skillsRoot = path.join(worktree, '.agents', 'skills');
      fs.mkdirSync(skillsRoot, { recursive: true });
      fs.cpSync(path.join(source, 'skills'), path.join(skillsRoot, 'superpowers'), { recursive: true });
    }
    record = checkout;
  } else if (method === 'keelson') {
    const snapshot = options.keelsonSnapshot;
    if (!snapshot?.clean) throw new Error('Keelson source must be a clean frozen checkout');
    const frameworkRuntime = { kind: 'keelson', ...snapshot };
    const smoke = dockerCommand(worktree, ['sh', '-lc', 'command -v keelson && keelson --version && keelson guide'], 300000, { frameworkRuntime });
    writeLog(evidenceDir, 'keelson-container-smoke', smoke);
    record = smoke.exit_code === 0
      ? dockerCommand(worktree, ['keelson', 'init', '--codex'], 300000, { frameworkRuntime })
      : smoke;
    record.frameworkRuntime = frameworkRuntime;
  }
  writeLog(evidenceDir, 'method-setup', record);
  return record;
}

function parseEvents(jsonl) {
  const events = [];
  for (const line of jsonl.split('\n')) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* raw file remains the authority */ }
  }
  return events;
}

function frameworkRoots(method) {
  if (method === 'openspec') return ['.agents/skills', 'openspec'];
  if (method === 'trellis') return ['.agents/skills', '.trellis', 'AGENTS.md'];
  if (method === 'superpowers') return ['.agents/skills/superpowers'];
  if (method === 'keelson') return ['.keelson', '.agents/skills', 'AGENTS.md'];
  return [];
}

function activationInstruction(method) {
  const instructions = {
    openspec: 'This is the OpenSpec treatment. Before implementation, read and use the applicable installed OpenSpec skills to carry this task through its workflow. Do not merely leave its files unused.',
    trellis: 'This is the Trellis treatment. Before implementation, read and use the applicable installed Trellis guidance to carry this task through its workflow. Do not merely leave its files unused.',
    superpowers: 'This is the Superpowers treatment. Before implementation, read and use the applicable installed Superpowers skills to carry this task through its workflow. Do not merely leave its files unused.',
    keelson: 'This is the Keelson treatment. Before implementation, read and use the applicable installed Keelson guidance to carry this task through its workflow. Do not merely leave its files unused.',
  };
  return instructions[method] ?? 'This is the bare treatment: execute the task directly with the repository and the task prompt.';
}

function frameworkEvidence(method, worktree, codexEvents) {
  const roots = frameworkRoots(method);
  const installed = roots.map((relative) => {
    const absolute = path.join(worktree, relative);
    return {
      path: relative,
      exists: fs.existsSync(absolute),
      symlink_target: fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink() ? fs.readlinkSync(absolute) : null,
    };
  });
  // A status/output event may mention a framework artifact without the model
  // having read it. Count only an emitted tool command that directly names it.
  const commands = codexEvents
    .map((event, index) => ({ index, command: event?.item?.command }))
    .filter(({ command }) => typeof command === 'string');
  const runtime_references = commands
    .filter(({ command }) => roots.some((root) => command.includes(root)))
    .map(({ index, command }) => ({ index, command }));
  const guidance_read_references = commands.filter(({ command }) => (
    (roots.some((root) => command.includes(root)) && /\b(cat|sed|head|tail|less|more|awk)\b/.test(command))
    || (method === 'keelson' && /\bkeelson\s+(guide|ask|check|record)\b/.test(command))
  ));
  const globalRoots = [
    path.join(os.homedir(), '.codex'), path.join(os.homedir(), '.agents'),
    '/home/node/.codex', '/home/node/.agents',
  ];
  const global_instruction_references = commands
    .filter(({ command }) => globalRoots.some((root) => command.includes(root)))
    .map(({ index, command }) => ({ index, command }));
  return {
    installed_artifacts: installed,
    runtime_references,
    guidance_read_references,
    runtime_usage_observed: guidance_read_references.length > 0,
    activation_observed: method === 'bare' || guidance_read_references.length > 0,
    global_instruction_references,
    global_instruction_contamination_observed: global_instruction_references.length > 0,
    comparison_eligible: (method === 'bare' || guidance_read_references.length > 0) && global_instruction_references.length === 0,
    note: 'Artifact presence proves setup only. A non-bare treatment requires a direct raw Codex tool command that reads a project-local guidance artifact (or, for Keelson, invokes guide/ask/check/record) to establish activation. Listing paths alone is insufficient. This does not establish causal effectiveness. Any direct global instruction-path read makes a run ineligible for a clean causal comparison.',
  };
}

function verifyTaskEnvironment(task, outputRoot, options) {
  const evidenceDir = path.join(outputRoot, 'task-environment', task.id);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-preflight-'));
  const worktree = path.join(tempRoot, 'worktree');
  const started = Date.now();
  const outcome = { task: task.id, repository: task.repository, baseline_sha: task.baseline_sha, upstream_fix_sha: task.upstream_fix_sha };
  try {
    const clone = run('git', ['clone', '--filter=blob:none', task.repository, worktree], { timeoutMs: 600000 });
    writeLog(evidenceDir, 'clone', clone);
    if (clone.exit_code !== 0) throw new Error('source clone failed');
    const baselineCheckout = git(worktree, ['checkout', '--detach', task.baseline_sha]);
    writeLog(evidenceDir, 'baseline-checkout', baselineCheckout);
    if (baselineCheckout.exit_code !== 0) throw new Error(`baseline checkout failed: ${baselineCheckout.stderr}`);
    // Preflight deliberately keeps the clone history: it must check the oracle SHA.
    fs.appendFileSync(path.join(worktree, '.git', 'info', 'exclude'), '\n.bench-venv/\n.bench-get-pip.py\n.bench-pydeps/\n');
    const environment = pythonSetup(worktree, evidenceDir, options);
    outcome.environment_exit_code = environment.exit_code;
    const executePublic = (label) => {
      const record = options.isolation === 'docker'
        ? dockerCommand(worktree, ['sh', '-lc', task.public_verification[0]], 300000, { env: ['PYTHONPATH=src:.bench-pydeps'] })
        : run('sh', ['-lc', task.public_verification[0]], { cwd: worktree, env: environment.env, timeoutMs: 300000 });
      writeLog(evidenceDir, `${label}-public-verification`, record);
      return record;
    };
    outcome.baseline_public_exit_code = environment.exit_code === 0 ? executePublic('baseline').exit_code : null;
    const hiddenDir = path.join(worktree, '.bench-hidden');
    fs.mkdirSync(hiddenDir, { recursive: true });
    fs.copyFileSync(path.join(task.dir, task.hidden_test), path.join(hiddenDir, task.hidden_test));
    const executeHidden = (label) => {
      const record = options.isolation === 'docker'
        ? dockerCommand(worktree, ['python3', '-m', 'pytest', `.bench-hidden/${task.hidden_test}`, '-q'], 300000, { env: ['PYTHONPATH=src:.bench-pydeps'] })
        : run(environment.python, ['-m', 'pytest', `.bench-hidden/${task.hidden_test}`, '-q'], { cwd: worktree, env: environment.env, timeoutMs: 300000 });
      writeLog(evidenceDir, `${label}-hidden-acceptance`, record);
      return record;
    };
    outcome.baseline_hidden_exit_code = environment.exit_code === 0 ? executeHidden('baseline').exit_code : null;
    const oracleCheckout = git(worktree, ['checkout', '--detach', task.upstream_fix_sha]);
    writeLog(evidenceDir, 'oracle-checkout', oracleCheckout);
    outcome.oracle_checkout_exit_code = oracleCheckout.exit_code;
    outcome.oracle_public_exit_code = environment.exit_code === 0 && oracleCheckout.exit_code === 0 ? executePublic('oracle').exit_code : null;
    outcome.oracle_hidden_exit_code = environment.exit_code === 0 && oracleCheckout.exit_code === 0 ? executeHidden('oracle').exit_code : null;
    outcome.regression_environment_valid = outcome.environment_exit_code === 0
      && outcome.baseline_public_exit_code === 0 && outcome.oracle_public_exit_code === 0
      && outcome.baseline_hidden_exit_code !== 0 && outcome.oracle_hidden_exit_code === 0;
  } catch (error) {
    outcome.regression_environment_valid = false;
    outcome.harness_error = error.message;
  } finally {
    outcome.elapsed_ms = Date.now() - started;
    outcome.worktree_retained_at = options.keepWorktrees ? worktree : null;
    writeJson(path.join(evidenceDir, 'preflight.json'), outcome);
    if (!options.keepWorktrees) fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return outcome;
}

function verifyMethodRuntime(task, method, outputRoot, options) {
  const evidenceDir = path.join(outputRoot, 'method-runtime', method);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-method-preflight-'));
  const worktree = path.join(tempRoot, 'worktree');
  const outcome = { task: task.id, method, without_codex: true };
  try {
    checkoutIsolatedBaseline(task, worktree, evidenceDir);
    const setup = methodSetup(method, worktree, evidenceDir, tempRoot, options);
    outcome.setup_exit_code = setup.exit_code;
    if (method === 'trellis' && setup.exit_code === 0) {
      const scripts = dockerCommand(worktree, ['python3', '.trellis/scripts/task.py', '--help'], 300000);
      writeLog(evidenceDir, 'trellis-script-smoke', scripts);
      outcome.trellis_script_exit_code = scripts.exit_code;
    }
    outcome.valid = outcome.setup_exit_code === 0 && (method !== 'trellis' || outcome.trellis_script_exit_code === 0);
  } catch (error) {
    outcome.valid = false;
    outcome.harness_error = error.message;
  } finally {
    writeJson(path.join(evidenceDir, 'preflight.json'), outcome);
    if (!options.keepWorktrees) fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return outcome;
}

function smokeFrameworkWithModel(task, method, outputRoot, options) {
  const evidenceDir = path.join(outputRoot, 'framework-model-smoke', method);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-model-smoke-'));
  const worktree = path.join(tempRoot, 'worktree');
  const outcome = { task: task.id, method, without_task_implementation: true };
  try {
    checkoutIsolatedBaseline(task, worktree, evidenceDir);
    const setup = methodSetup(method, worktree, evidenceDir, tempRoot, options);
    outcome.setup_exit_code = setup.exit_code;
    const prompt = method === 'openspec'
      ? 'Do not modify any files. Run exactly `openspec --version` and `openspec list --json` in this worktree, then state each command and whether it succeeded.'
      : `Do not modify any files. Exercise the installed ${method} runtime with its version or status command, then state the command and whether it succeeded.`;
    const args = ['exec', '--json', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--model', options.model, '--sandbox', 'danger-full-access', '--cd', '/workspace', prompt];
    const codex = setup.exit_code === 0
      ? dockerCodex(worktree, args, options.timeoutMinutes * 60 * 1000, setup.frameworkRuntime ?? null)
      : { command: [], exit_code: 125, stdout: '', stderr: 'setup failed', elapsed_ms: 0 };
    fs.writeFileSync(path.join(evidenceDir, 'codex.events.jsonl'), codex.stdout);
    writeLog(evidenceDir, 'codex', codex);
    const commands = parseEvents(codex.stdout).map((event) => event.item).filter((item) => item?.type === 'command_execution');
    const openspecVersion = commands.some((item) => /\bopenspec\s+--version\b/.test(item.command ?? '') && item.exit_code === 0);
    const openspecList = commands.some((item) => /\bopenspec\s+list\s+--json\b/.test(item.command ?? '') && item.exit_code === 0);
    outcome.codex_exit_code = codex.exit_code;
    outcome.openspec_version_observed = method === 'openspec' ? openspecVersion : null;
    outcome.openspec_list_observed = method === 'openspec' ? openspecList : null;
    outcome.valid = setup.exit_code === 0 && codex.exit_code === 0 && (method !== 'openspec' || (openspecVersion && openspecList));
  } catch (error) {
    outcome.valid = false;
    outcome.harness_error = error.message;
  } finally {
    writeJson(path.join(evidenceDir, 'preflight.json'), outcome);
    if (!options.keepWorktrees) fs.rmSync(tempRoot, { recursive: true, force: true });
  }
  return outcome;
}

function runOne(task, method, repetition, outputRoot, options) {
  const slug = `${task.id}__${method}__r${repetition}`;
  const evidenceDir = path.join(outputRoot, slug);
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'prompt.md'), task.prompt);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-run-'));
  const worktree = path.join(tempRoot, 'worktree');
  const started = Date.now();
  let cleanup = !options.keepWorktrees;
  try {
    const checkout = checkoutIsolatedBaseline(task, worktree, evidenceDir);
    if (checkout.exit_code !== 0) throw new Error(`baseline checkout failed: ${checkout.stderr}`);
    fs.appendFileSync(path.join(worktree, '.git', 'info', 'exclude'), '\n.bench-venv/\n.bench-hidden/\n.bench-get-pip.py\n.bench-pydeps/\n');
    writeJson(path.join(evidenceDir, 'baseline.json'), { repository: task.repository, baseline_sha: task.baseline_sha, upstream_fix_sha: task.upstream_fix_sha });

    const setup = methodSetup(method, worktree, evidenceDir, tempRoot, options);
    const setupPaths = changedPaths(worktree);
    writeJson(path.join(evidenceDir, 'setup-paths.json'), setupPaths);
    writeJson(path.join(evidenceDir, 'setup-footprint.json'), setupFootprint(worktree, setupPaths));
    const environment = pythonSetup(worktree, evidenceDir, options);
    let codex;
    const treatment = activationInstruction(method);
    const effectivePrompt = `${task.prompt}\n\n${treatment}\n\nThe harness has provisioned this public-test command in the worktree: \`${task.public_verification[0]}\`. Use it or another useful public verification command as appropriate. Work only from the provided baseline source in this worktree. Do not search the network or upstream history for a patch or answer. Installed framework CLI commands may load their own pinned package resources when invoked; do not otherwise access unrelated user-level guidance, instructions, skills, or configuration outside this worktree.`;
    fs.writeFileSync(path.join(evidenceDir, 'effective-prompt.md'), effectivePrompt);
    fs.writeFileSync(path.join(evidenceDir, 'treatment.md'), `${treatment}\n`);
    if (setup.exit_code !== 0 || environment.exit_code !== 0) {
      codex = { command: [], cwd: worktree, exit_code: 125, signal: null, error: 'precondition failed', elapsed_ms: 0, stdout: '', stderr: '' };
      writeLog(evidenceDir, 'codex', codex);
    } else {
      const codexWorkdir = options.isolation === 'docker' ? '/workspace' : worktree;
      // Docker provides the outer filesystem boundary. Its default seccomp
      // profile blocks unprivileged user namespaces, so Codex's nested bwrap
      // workspace sandbox cannot start there. Do not use this mode on host.
      const codexSandbox = options.isolation === 'docker' ? 'danger-full-access' : 'workspace-write';
      const args = ['exec', '--json', '--ephemeral', '--ignore-user-config', '--ignore-rules', '--model', options.model,
        '--sandbox', codexSandbox, '--cd', codexWorkdir, effectivePrompt];
      codex = options.isolation === 'docker'
        ? dockerCodex(worktree, args, options.timeoutMinutes * 60 * 1000, setup.frameworkRuntime ?? null)
        : run('codex', args, { cwd: worktree, timeoutMs: options.timeoutMinutes * 60 * 1000 });
      fs.writeFileSync(path.join(evidenceDir, 'codex.events.jsonl'), codex.stdout);
      writeLog(evidenceDir, 'codex', codex);
    }

    const publicVerification = options.isolation === 'docker'
      ? dockerCommand(worktree, ['sh', '-lc', task.public_verification[0]], 300000, { env: ['PYTHONPATH=src:.bench-pydeps'] })
      : run('sh', ['-lc', task.public_verification[0]], { cwd: worktree, env: environment.env, timeoutMs: 300000 });
    writeLog(evidenceDir, 'public-verification', publicVerification);
    const hiddenDir = path.join(worktree, '.bench-hidden');
    fs.mkdirSync(hiddenDir, { recursive: true });
    fs.copyFileSync(path.join(task.dir, task.hidden_test), path.join(hiddenDir, task.hidden_test));
    const acceptance = options.isolation === 'docker'
      ? dockerCommand(worktree, ['python3', '-m', 'pytest', `.bench-hidden/${task.hidden_test}`, '-q'], 300000, { env: ['PYTHONPATH=src:.bench-pydeps'] })
      : run(environment.python, ['-m', 'pytest', `.bench-hidden/${task.hidden_test}`, '-q'], { cwd: worktree, env: environment.env, timeoutMs: 300000 });
    writeLog(evidenceDir, 'acceptance', acceptance);
    const paths = changedPaths(worktree, setupPaths);
    writeJson(path.join(evidenceDir, 'final-paths.json'), paths);
    const finalHead = git(worktree, ['rev-parse', 'HEAD']);
    const committedAfterBaseline = git(worktree, ['log', '--format=%H', 'benchmark-baseline..HEAD']);
    writeJson(path.join(evidenceDir, 'final-head.json'), {
      head: finalHead.exit_code === 0 ? finalHead.stdout.trim() : null,
      commits_after_baseline: committedAfterBaseline.exit_code === 0
        ? committedAfterBaseline.stdout.split('\n').filter(Boolean) : [],
    });
    const patch = finalPatch(worktree, git, { excludePaths: setupPaths });
    writeJson(path.join(evidenceDir, 'final-untracked-paths.json'), patch.untracked_paths);
    fs.writeFileSync(path.join(evidenceDir, 'final.patch'), patch.patch);
    const usage = findUsage(parseEvents(codex.stdout));
    const framework = frameworkEvidence(method, worktree, parseEvents(codex.stdout));
    writeJson(path.join(evidenceDir, 'framework-evidence.json'), framework);
    const summary = summarizeRun({
      codexExitCode: codex.exit_code,
      publicVerificationExitCode: publicVerification.exit_code,
      acceptanceExitCode: acceptance.exit_code,
      changedPaths: paths,
      requiredSourceFiles: task.required_source_files,
      elapsedMs: Date.now() - started,
      tokens: usage,
    });
    summary.task = task.id;
    summary.method = method;
    summary.repetition = repetition;
    summary.setup_exit_code = setup.exit_code;
    summary.environment_exit_code = environment.exit_code;
    summary.public_verification_exit_code = publicVerification.exit_code;
    summary.codex_elapsed_ms = codex.elapsed_ms;
    summary.setup_paths = setupPaths;
    summary.final_source_paths = sourcePaths(paths);
    summary.framework_runtime_usage_observed = framework.runtime_usage_observed;
    summary.framework_activation_observed = framework.activation_observed;
    summary.global_instruction_contamination_observed = framework.global_instruction_contamination_observed;
    summary.comparison_eligible = framework.comparison_eligible;
    summary.harness_elapsed_ms = summary.elapsed_ms;
    summary.worktree_retained_at = options.keepWorktrees ? worktree : null;
    writeJson(path.join(evidenceDir, 'summary.json'), summary);
    return summary;
  } catch (error) {
    const summary = {
      task: task.id, method, repetition, pass: false, harness_error: error.message,
      elapsed_ms: Date.now() - started, worktree_retained_at: options.keepWorktrees ? worktree : null,
    };
    writeJson(path.join(evidenceDir, 'summary.json'), summary);
    return summary;
  } finally {
    if (cleanup) fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.keelsonSource) options.keelsonSnapshot = keelsonSnapshot(options.keelsonSource);
  const ids = options.matrix || (options.verifyEnvironment && !options.task) || options.verifyMethod || options.smokeFrameworkModel ? taskIds() : [options.task];
  const tasks = ids.map(loadTask);
  const outputRoot = path.resolve(options.output ?? path.join(RESULTS, `${new Date().toISOString().replace(/[:.]/g, '-')}-${options.model}`));
  fs.mkdirSync(outputRoot, { recursive: true });
  writeJson(path.join(outputRoot, 'provenance.json'), {
    protocol: 'frozen-5', started_at: new Date().toISOString(), codex_cli: codexVersion(), model: options.model,
    prompt_clarification: 'Installed framework CLI commands may load their own pinned package resources when invoked; unrelated user-level guidance remains prohibited. Applied after the initial bare/OpenSpec/Trellis frozen-3 runs; their saved effective prompts remain authoritative.',
    openspec: { ...OPEN_SPEC, docker_cli_runtime: '/opt/openspec/node_modules/.bin/openspec', runtime_smoke: 'command -v openspec && openspec --version && openspec --help' }, trellis: TRELLIS,
    superpowers: { repository: 'https://github.com/obra/superpowers.git', sha: SUPERPOWERS_SHA },
    methods: options.methods, repetitions: options.repetitions, repetition_start: options.repetitionStart,
    locked_test_dependency_source: 'the task baseline uv.lock; selected Flask tests-group and pytest runtime packages are exact version pins',
    verify_environment_only: Boolean(options.verifyEnvironment),
    verify_method_only: options.verifyMethod ?? null,
    smoke_framework_model_only: options.smokeFrameworkModel ?? null,
    isolation: {
      codex_flags: ['--ephemeral', '--ignore-user-config', '--ignore-rules', options.isolation === 'docker' ? '--sandbox danger-full-access (inside Docker boundary)' : '--sandbox workspace-write'],
      mode: options.isolation,
      bwrap_available: commandAvailable('bwrap'),
      docker_image: options.isolation === 'docker' ? DOCKER_IMAGE : null,
      docker_available: options.isolation === 'docker' ? dockerAvailable() : false,
      direct_global_instruction_read_invalidates_comparison: true,
    },
    keelson: options.keelsonSnapshot ?? null,
  });
  if (options.verifyEnvironment) {
    const preflight = tasks.map((task) => verifyTaskEnvironment(task, outputRoot, options));
    writeJson(path.join(outputRoot, 'matrix.json'), preflight);
    for (const result of preflight) console.log(`${result.task} environment: ${result.regression_environment_valid ? 'VALID' : 'INVALID'}`);
    console.log(`Evidence: ${outputRoot}`);
    process.exitCode = preflight.some((result) => !result.regression_environment_valid) ? 1 : 0;
    return;
  }
  if (options.verifyMethod) {
    const preflight = verifyMethodRuntime(tasks[0], options.verifyMethod, outputRoot, options);
    console.log(`${options.verifyMethod} runtime: ${preflight.valid ? 'VALID' : 'INVALID'}`);
    console.log(`Evidence: ${outputRoot}`);
    process.exitCode = preflight.valid ? 0 : 1;
    return;
  }
  if (options.smokeFrameworkModel) {
    const preflight = smokeFrameworkWithModel(tasks[0], options.smokeFrameworkModel, outputRoot, options);
    console.log(`${options.smokeFrameworkModel} model runtime: ${preflight.valid ? 'VALID' : 'INVALID'}`);
    console.log(`Evidence: ${outputRoot}`);
    process.exitCode = preflight.valid ? 0 : 1;
    return;
  }
  const summaries = [];
  for (const task of tasks) {
    for (const method of options.methods) {
      for (let repetition = options.repetitionStart; repetition < options.repetitionStart + options.repetitions; repetition += 1) {
        const summary = runOne(task, method, repetition, outputRoot, options);
        summaries.push(summary);
        console.log(`${task.id} ${method} r${repetition}: ${summary.pass ? 'PASS' : 'FAIL'}`);
      }
    }
  }
  writeJson(path.join(outputRoot, 'matrix.json'), summaries);
  console.log(`Evidence: ${outputRoot}`);
  process.exitCode = summaries.some((summary) => !summary.pass) ? 1 : 0;
}

main();
