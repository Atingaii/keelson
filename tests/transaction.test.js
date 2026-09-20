import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, write, read } from './helpers.js';
import { landingTransaction, recoverLanding } from '../src/lib/transaction.js';
import { runtimeDir } from '../src/lib/runtime-path.js';
import { resolveWithin } from '../src/lib/paths.js';

test('landing restores all changed targets after a mid-write failure', (t) => {
  const root = tmpProject({ 'one/spec.md': 'before', 'two/spec.md': 'other' });
  const runtime = runtimeDir(root);
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(runtime, { recursive: true, force: true }); });
  const one = path.join(root, 'one'), two = path.join(root, 'two'), fresh = path.join(root, 'new');
  assert.throws(() => landingTransaction(root, [one, two, fresh], () => {
    write(root, 'one/spec.md', 'changed');
    fs.rmSync(two, { recursive: true });
    write(root, 'new/evidence.txt', 'partial');
    throw new Error('disk failure');
  }), /disk failure/);
  assert.equal(read(root, 'one/spec.md'), 'before');
  assert.equal(read(root, 'two/spec.md'), 'other');
  assert.equal(fs.existsSync(fresh), false);
  assert.equal(recoverLanding(root), false);
});

test('interrupted landing restores from its durable journal', (t) => {
  const root = tmpProject({ 'one/spec.md': 'partial' });
  const runtime = runtimeDir(root);
  t.after(() => { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(runtime, { recursive: true, force: true }); });
  const dir = path.join(runtime, 'landing-transaction');
  fs.mkdirSync(path.join(dir, '0'), { recursive: true });
  fs.writeFileSync(path.join(dir, '0/spec.md'), 'before');
  fs.writeFileSync(path.join(dir, 'journal.json'), JSON.stringify({ phase: 'prepared', entries: [{ target: path.join(root, 'one'), backup: path.join(dir, '0'), existed: true }] }));
  assert.equal(recoverLanding(root), true);
  assert.equal(read(root, 'one/spec.md'), 'before');
  assert.equal(recoverLanding(root), false);
});

test('project data paths reject traversal and symbolic-link parents', (t) => {
  const root = tmpProject();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.throws(() => resolveWithin(root, '../outside'), /escapes/);
  assert.throws(() => resolveWithin(root, '.'), /escapes/);
  fs.symlinkSync(path.dirname(root), path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveWithin(root, 'link/specs'), /symlink/);
  fs.symlinkSync(path.join(root, 'missing'), path.join(root, 'dangling'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => resolveWithin(root, 'dangling/specs'), /symlink/);
  assert.equal(resolveWithin(root, 'new/spec.md'), path.join(root, 'new/spec.md'));
});
