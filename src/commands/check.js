import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig, checkEntries } from '../lib/config.js';
import { append, write } from '../lib/fs.js';
import { loadAllChanges, loadChange } from '../lib/changes.js';
import { evaluateLifecycle } from '../lib/lifecycle.js';
import { changeSpecDrift } from '../lib/specs.js';
import { worktreeFingerprint } from '../lib/git.js';
import { readSession } from '../lib/session.js';
import { contractFingerprint, recordStatement, sha256, trustCommands, verificationStatement } from '../lib/evidence.js';
import { beginCheck } from '../lib/check-activity.js';

export function verifyLine(claim, results, tree) {
  return `### Verify: ${String(claim).replace(/[\r\n]/g, ' ')}\n${results.map((r) => `\`${r.cmd}\` exit ${r.exit}`).join('; ')}${tree ? ` · tree ${tree}` : ''}`;
}

/** Kill the process group on deadline, including shell descendants holding pipes. */
export function runCommand(cmd, root, timeout) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, { cwd: root, shell: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    let output = '';
    let timedOut = false;
    let truncated = false;
    let size = 0;
    let errorText = '';
    const kill = () => {
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000 });
        else process.kill(-child.pid, 'SIGKILL');
      } catch { child.kill('SIGKILL'); }
    };
    const timer = setTimeout(() => { timedOut = true; kill(); }, timeout);
    const consume = (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size <= 2 * 1024 * 1024) output += chunk;
      else if (!truncated) { truncated = true; output += '\n[output limit exceeded]\n'; kill(); }
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    child.on('error', (error) => { errorText = error.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const exit = timedOut ? 124 : truncated ? 125 : code ?? 1;
      resolve({ exit, signal, timedOut, truncated, durationMs: Date.now() - started, output: output + (errorText ? `\n${errorText}\n` : '') });
    });
  });
}

export async function check({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const configured = checkEntries(cfg);
  const entries = positional.length ? [{ name: positional.join(' '), command: positional.join(' '), kind: 'check' }] : configured;
  if (!entries.length) throw new Error('no check commands configured. Add `check:` commands to .keelson/config.yaml before claiming completion.');
  const timeout = Number(flags.timeout ?? cfg.check_timeout_ms ?? 600000);
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 86400000) throw new Error('--timeout must be an integer in milliseconds (1..86400000)');
  let change;
  if (flags.record !== undefined) {
    const all = loadAllChanges(p.changes);
    const focused = readSession(root).state?.change;
    const name = flags.change ?? (all.some((c) => c.name === focused) ? focused : all.length === 1 ? all[0].name : null);
    change = all.find((c) => c.name === name);
    if (!change) throw new Error('recording requires one active change; use `keelson new <name>` or `--change <name>`');
  }
  trustCommands(root, entries.map((e) => e.command), Boolean(flags.trust));
  const finish = beginCheck(root);
  try {
  const dir = change?.dir ?? p.runtime;
  const before = { tree: worktreeFingerprint(root), contract: contractFingerprint(root, dir) };
  const startedOn = new Date().toISOString();
  const results = [];
  for (const entry of entries) {
    const run = await runCommand(entry.command, root, timeout);
    const log = `$ ${entry.command}\nexit ${run.exit}\n\n${run.output}`;
    const logDigest = sha256(log);
    const file = path.join(dir, 'evidence', `${logDigest}.log`);
    write(file, log);
    const { output, ...metadata } = run;
    results.push({ cmd: entry.command, name: entry.name, kind: entry.kind, ...metadata, logDigest });
    if (!flags.json && !flags.quiet && output) process.stdout.write(output);
    if (!flags.json) console.log(`${run.exit ? '✗' : '✓'} ${entry.name}: exit ${run.exit}${run.timedOut ? ' (timeout)' : ''}`);
  }
  const unchanged = before.tree === worktreeFingerprint(root) && before.contract === contractFingerprint(root, dir);
  const complete = JSON.stringify(entries.map((e) => e.command)) === JSON.stringify(configured.map((e) => e.command));
  const passed = unchanged && results.every((r) => r.exit === 0);
  const claim = typeof flags.record === 'string' ? flags.record : passed ? 'checks pass' : 'checks failed';
  if (change) {
    recordStatement(root, dir, verificationStatement({ ...before, results, claim, startedOn, unchanged, complete, model: typeof flags.model === 'string' ? flags.model : null, host: process.env.CODEX_THREAD_ID ? 'codex' : null }));
    append(path.join(dir, 'ledger.md'), `\n${verifyLine(claim, results, before.tree)}\n`);
  }
  const result = { ok: passed, complete, unchanged, tree: before.tree, contract: before.contract, results, record: change ? path.relative(root, path.join(dir, 'ledger.jsonl')) : null };
  if (flags.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(passed ? 'all checks passed' : unchanged ? 'checks failed' : 'inputs changed during checking; re-run checks');
    if (change) console.log(`recorded in ${result.record}`);
    if (!complete) console.log('partial suite: this run cannot authorize landing');
    if (change && passed && complete) {
      const current = loadChange(p.changes, change.name);
      const lifecycle = evaluateLifecycle(current, before.tree, { activeNames: loadAllChanges(p.changes).map((c) => c.name), contractDrift: changeSpecDrift(current, p.specs) });
      if (lifecycle.work === 'ready') console.log(`${change.name}: ready → run \`keelson land ${change.name}\``);
    }
  }
  return passed ? 0 : 1;
  } finally { finish(); }
}
