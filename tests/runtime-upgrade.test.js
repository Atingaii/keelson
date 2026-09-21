import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, run, read, write, exists } from './helpers.js';
import { captureRuntimeOwnership } from '../src/platforms/runtime.js';

const shim = '.agents/skills/keelson/SKILL.md';
const manifest = '.keelson/manifest.json';

test('published 0.4 discovery and workflow outputs upgrade without force', () => {
  for (const version of ['0.4.0', '0.4.1']) for (const lang of ['en', 'zh']) {
    const dir = tmpProject({});
    run(dir, ['init', '--agents', '--vendor', '--lang', lang]);
    const state = JSON.parse(read(dir, manifest));
    state.packageVersion = version;
    delete state.runtime;
    write(dir, manifest, JSON.stringify(state));
    const fixture = path.resolve('tests/fixtures/v0.4-runtime', version, lang);
    write(dir, shim, fs.readFileSync(path.join(fixture, 'SKILL.md'), 'utf8'));
    write(dir, '.keelson/workflow.md', fs.readFileSync(path.join(fixture, 'workflow-lean.md'), 'utf8'));
    run(dir, ['update']);
    const updated = JSON.parse(read(dir, manifest));
    assert.notEqual(updated.packageVersion, version);
    assert.equal(updated.runtime['.agents/skills/keelson'].length, 64);
  }
});

function previousInstallation() {
  const dir = tmpProject({});
  run(dir, ['init', '--agents', '--vendor']);
  // A future release must recognize recorded old bytes, without needing a new
  // allowlist every time its description, workflow or references change.
  for (const file of [shim, '.keelson/workflow.md', '.keelson/skill/references/interview.md']) {
    write(dir, file, read(dir, file) + '\nPrevious release guidance.\n');
  }
  const state = JSON.parse(read(dir, manifest));
  state.packageVersion = '0.0.0-fixture';
  state.runtime = captureRuntimeOwnership(dir, state.targets, true);
  write(dir, manifest, JSON.stringify(state));
  return dir;
}

test('recorded runtime digests allow future upgrades and uninstall across versions', () => {
  const dir = previousInstallation();
  run(dir, ['update', '--lang', 'zh', '--profile', 'guided', '--guide']);
  for (const file of [shim, '.keelson/workflow.md', '.keelson/skill/references/interview.md']) {
    assert.ok(!read(dir, file).includes('Previous release guidance.'));
  }
  const old = previousInstallation();
  run(old, ['uninstall']);
  assert.ok(!exists(old, shim));
  assert.ok(!exists(old, '.keelson/workflow.md'));
  assert.ok(!exists(old, '.keelson/skill'));
});

test('edited and extended old runtime is protected before any config or guidance writes', () => {
  for (const file of [shim, '.keelson/workflow.md', '.keelson/skill/references/interview.md', '.keelson/skill/.owner-note']) {
    const dir = previousInstallation();
    write(dir, file, (exists(dir, file) ? read(dir, file) : '') + '\nOwner customization.\n');
    const watched = [manifest, '.keelson/config.yaml', '.keelson/README.md', shim, '.keelson/workflow.md', file];
    const before = watched.map((name) => read(dir, name));
    const result = run(dir, ['update', '--lang', 'zh'], { allowFail: true });
    assert.notEqual(result.code, 0, file);
    assert.match(result.stderr, /differs/);
    assert.deepEqual(watched.map((name) => read(dir, name)), before, file);
  }
});
