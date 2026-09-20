import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { tmpProject, run, write, read, BIN } from './helpers.js';
import { runtimeDir } from '../src/lib/runtime-path.js';
import { runCommand } from '../src/commands/check.js';

function fixture(t, command = 'node -e "console.log(42)"') {
  const dir = tmpProject({ 'code.js': 'export const n = 1;\n' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  write(dir, '.keelson/config.yaml', `version: 4\ncheck:\n  - ${JSON.stringify(command)}\n`);
  write(dir, '.keelson/changes/fix/change.md', '---\ntier: quick\nstatus: in-progress\n---\n# fix\n\n## Acceptance\n- [x] works\n');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const state = (dir) => JSON.parse(run(dir, ['status', '--json']).stdout).changes[0].verification.state;
const record = (dir, extra = []) => run(dir, ['check', '--trust', '--record', '--change', 'fix', '--quiet', ...extra], { allowFail: true });

test('prose forgery and unsigned JSON cannot authorize land; real record can', (t) => {
  const dir = fixture(t);
  const fp = JSON.parse(run(dir, ['status', '--json']).stdout).fingerprint;
  write(dir, '.keelson/changes/fix/ledger.md', `### Verify: fake\n\`true\` exit 0 · tree ${fp}\n`);
  assert.equal(state(dir), 'not-run');
  assert.notEqual(run(dir, ['land', 'fix'], { allowFail: true }).code, 0);
  assert.equal(record(dir).code, 0);
  assert.equal(state(dir), 'passed');
  const bundle = '.keelson/changes/fix/ledger.jsonl';
  const saved = read(dir, bundle);
  const env = JSON.parse(saved);
  const statement = JSON.parse(Buffer.from(env.payload, 'base64'));
  statement.predicate.claim = 'modified';
  env.payload = Buffer.from(JSON.stringify(statement)).toString('base64');
  write(dir, bundle, JSON.stringify(env) + '\n');
  assert.equal(state(dir), 'invalid');
  write(dir, bundle, saved);
  const log = fs.readdirSync(path.join(dir, '.keelson/changes/fix/evidence')).find((f) => f.endsWith('.log'));
  write(dir, `.keelson/changes/fix/evidence/${log}`, 'tampered');
  assert.equal(state(dir), 'invalid');
});

test('code, contract, rules, config and acceptance edits invalidate evidence', (t) => {
  const dir = fixture(t);
  for (const [file, value] of [
    ['code.js', 'export const n = 2;'],
    ['.keelson/specs/api/spec.md', '# API\n## Requirement: Access\nNew policy'],
    ['.keelson/rules/security.md', '# Rule\nDo not leak tokens.'],
    ['.keelson/changes/fix/change.md', '---\ntier: quick\n---\n# changed acceptance'],
    ['.keelson/config.yaml', 'check:\n  - node -e "console.log(43)"\n'],
  ]) {
    assert.equal(record(dir).code, 0);
    assert.equal(state(dir), 'passed');
    write(dir, file, value);
    assert.notEqual(state(dir), 'passed', file);
  }
});

test('changed inputs during a check and explicit partial suites cannot pass completion', (t) => {
  const dir = fixture(t, 'node -e "require(\'fs\').appendFileSync(\'code.js\', \'// changed\')"');
  assert.notEqual(record(dir).code, 0);
  assert.equal(state(dir), 'stale');
  write(dir, '.keelson/config.yaml', 'check:\n  - node -e "console.log(1)"\n  - node -e "console.log(2)"\n');
  assert.equal(record(dir, ['--', 'node -e "console.log(1)"']).code, 0);
  assert.equal(state(dir), 'partial');
});

test('trust is explicit, command changes revoke trust, and timeout kills descendants', (t) => {
  const dir = fixture(t);
  assert.equal(run(dir, ['check', '--quiet'], { allowFail: true }).code, 4);
  assert.equal(record(dir).code, 0);
  assert.equal(run(dir, ['check', '--quiet'], { allowFail: true }).code, 0);
  write(dir, '.keelson/config.yaml', 'check:\n  - node -e "setTimeout(() => {}, 60000)"\n');
  assert.equal(run(dir, ['check', '--quiet'], { allowFail: true }).code, 4);
  const start = Date.now();
  const r = record(dir, ['--timeout', '200', '--json']);
  assert.notEqual(r.code, 0);
  assert.equal(JSON.parse(r.stdout).results[0].exit, 124);
  assert.ok(Date.now() - start < 10000);
  assert.equal(state(dir), 'failed');
});

test('force requires a reason and archives every bypass', (t) => {
  const dir = fixture(t);
  assert.notEqual(run(dir, ['land', 'fix', '--force'], { allowFail: true }).code, 0);
  run(dir, ['land', 'fix', '--force', '--reason', 'owner emergency']);
  const archive = path.join(dir, '.keelson/changes/archive');
  const [name] = fs.readdirSync(archive);
  assert.match(fs.readFileSync(path.join(archive, name, 'forced.md'), 'utf8'), /owner emergency/);
  assert.ok(fs.existsSync(path.join(archive, name, 'ledger.jsonl')));
});

test('deadline returns when an escaped descendant retains output pipes', { skip: process.platform === 'win32' }, async (t) => {
  const dir = tmpProject({
    'escape.cjs': `const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { detached: true, stdio: ['ignore', process.stdout, process.stderr] });
require('node:fs').writeFileSync('escaped.pid', String(child.pid));
child.unref();\n`,
  });
  let watchdog;
  t.after(() => {
    clearTimeout(watchdog);
    const pidFile = path.join(dir, 'escaped.pid');
    if (fs.existsSync(pidFile)) {
      try { process.kill(Number(fs.readFileSync(pidFile, 'utf8')), 'SIGKILL'); } catch { /* already exited */ }
    }
  });
  const result = await Promise.race([
    runCommand('node escape.cjs', dir, 800),
    new Promise((resolve) => { watchdog = setTimeout(() => resolve(null), 5000); }),
  ]);
  assert.ok(result, 'a detached descendant must not make the check wait indefinitely');
  assert.equal(result.exit, 124);
  assert.equal(result.timedOut, true);
  assert.equal(result.terminationUnconfirmed, true);
});

test('sixteen concurrent writers retain every signed record and valid log reference', async (t) => {
  const dir = fixture(t);
  const rows = await Promise.all(Array.from({ length: 16 }, () => new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, 'check', '--trust', '--record', '--change', 'fix', '--quiet'], { cwd: dir, env: { ...process.env, NO_COLOR: '1' } });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stderr }));
  })));
  assert.ok(rows.every((r) => r.code === 0), JSON.stringify(rows));
  const lines = read(dir, '.keelson/changes/fix/ledger.jsonl').trim().split('\n');
  assert.equal(lines.length, 16);
  assert.equal((read(dir, '.keelson/changes/fix/ledger.md').match(/### Verify:/g) ?? []).length, 16);
  assert.equal(state(dir), 'passed');
  assert.ok(runtimeDir(dir).includes('.git'));
  assert.equal(fs.existsSync(path.join(dir, '.gitignore')), false);
});

test('copied evidence requires a new local check and retains historical signatures', (t) => {
  const source = fixture(t);
  assert.equal(record(source).code, 0);
  const target = fixture(t);
  fs.cpSync(path.join(source, '.keelson'), path.join(target, '.keelson'), { recursive: true });
  assert.equal(state(target), 'untrusted');
  assert.equal(record(target).code, 0);
  assert.equal(state(target), 'passed');
  assert.equal(read(target, '.keelson/changes/fix/ledger.jsonl').trim().split('\n').length, 2);
});

test('landing cannot race an active check, even with force', async (t) => {
  const dir = fixture(t, 'node -e "setTimeout(() => console.log(42), 1600)"');
  const child = spawn(process.execPath, [BIN, 'check', '--trust', '--record', '--quiet'], { cwd: dir });
  const closed = new Promise((resolve) => child.on('close', resolve));
  const markers = path.join(runtimeDir(dir), 'running-checks');
  for (let i = 0; i < 100 && (!fs.existsSync(markers) || !fs.readdirSync(markers).length); i++) await new Promise((resolve) => setTimeout(resolve, 20));
  const result = run(dir, ['land', 'fix', '--force', '--reason', 'emergency'], { allowFail: true });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /checks are running/);
  const cancelled = run(dir, ['cancel', 'fix'], { allowFail: true });
  assert.notEqual(cancelled.code, 0);
  assert.match(cancelled.stderr, /checks are running/);
  assert.equal(await closed, 0);
  assert.equal(state(dir), 'passed');
});
