import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpProject, run, write } from './helpers.js';

function project() {
  const dir = tmpProject({ 'code.js': 'export const value = 1;\n' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  write(dir, '.keelson/config.yaml', 'version: 4\ncheck:\n  - node -e "console.log(42)"\n');
  return dir;
}

function change(dir, directory, { publicKey = '' } = {}) {
  write(dir, `${directory}/change.md`, '---\ntier: quick\nstatus: in-progress\n---\n# tidy\n');
  if (publicKey) write(dir, `${directory}/evidence/public-key.pem`, publicKey);
}

test('attest resolves a unique archived original name and exports stale signed evidence', () => {
  const dir = project();
  change(dir, '.keelson/changes/tidy');
  assert.equal(run(dir, ['check', '--trust', '--record', '--change', 'tidy', '--quiet']).code, 0);
  // The signature remains intact, while an input edit makes the evidence stale.
  write(dir, 'code.js', 'export const value = 2;\n');
  const archive = '.keelson/changes/archive/2026-09-20-tidy';
  fs.mkdirSync(path.join(dir, '.keelson/changes/archive'), { recursive: true });
  fs.renameSync(path.join(dir, '.keelson/changes/tidy'), path.join(dir, archive));
  write(dir, `${archive}/landed.json`, JSON.stringify({ status: 'integrated', change: 'tidy' }) + '\n');

  const result = run(dir, ['attest', 'tidy', '--json'], { allowFail: true });
  assert.equal(result.code, 1, 'stale evidence must not pass the attestation gate');
  const exported = JSON.parse(result.stdout);
  assert.equal(exported.change, 'tidy');
  assert.equal(exported.verification.state, 'stale');
  assert.equal(exported.envelopes.length, 1, 'the signed record remains exportable for inspection');
});

test('attest prefers an active change and never aliases legacy suffixes to another original name', () => {
  const dir = project();
  change(dir, '.keelson/changes/tidy', { publicKey: 'active-key\n' });
  // This is the ordinary legacy change name "tidy-cancelled", not a cancelled
  // archive of "tidy". The old suffix matcher exported it as tidy.
  change(dir, '.keelson/changes/archive/2026-09-20-tidy-cancelled', { publicKey: 'cancelled-name\n' });

  const active = run(dir, ['attest', 'tidy', '--json'], { allowFail: true });
  assert.equal(active.code, 1);
  assert.equal(JSON.parse(active.stdout).publicKey, 'active-key\n');

  fs.rmSync(path.join(dir, '.keelson/changes/tidy'), { recursive: true, force: true });
  const unproven = run(dir, ['attest', 'tidy', '--json'], { allowFail: true });
  assert.notEqual(unproven.code, 0);
  assert.equal(unproven.stdout, '', 'the old implementation incorrectly exported this as tidy');
  assert.match(unproven.stderr, /cannot prove original name "tidy"/);
  assert.match(unproven.stderr, /2026-09-20-tidy-cancelled/);

  // A proven candidate cannot establish uniqueness while an older archive may
  // have the same original name. Recorded identity only resolves that archive.
  const proven = '.keelson/changes/archive/2026-09-21-tidy';
  change(dir, proven, { publicKey: 'plain-name\n' });
  for (const recorded of [false, true]) {
    if (recorded) write(dir, `${proven}/landed.json`, JSON.stringify({ change: 'tidy' }));
    const mixed = run(dir, ['attest', 'tidy', '--json'], { allowFail: true });
    assert.notEqual(mixed.code, 0);
    assert.equal(mixed.stdout, '', 'an uncertain candidate prevents proving a unique original name');
    assert.match(mixed.stderr, /cannot prove original name "tidy"/);
  }

  const exact = run(dir, ['attest', '2026-09-20-tidy-cancelled', '--json'], { allowFail: true });
  assert.equal(exact.code, 1);
  assert.equal(JSON.parse(exact.stdout).publicKey, 'cancelled-name\n');
});
