import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, write } from './helpers.js';
import { worktreeFingerprint } from '../src/lib/git.js';

test('fingerprints include ignored tracked code, exclude Keelson, and preserve the real index', () => {
  const root = tmpProject({ 'tracked.txt': 'one', '.keelson/INTENT.md': 'intent' });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  write(root, '.gitignore', 'tracked.txt\nignored.txt\n');
  const index = fs.readFileSync(path.join(root, '.git/index'));
  const first = worktreeFingerprint(root);
  assert.match(first, /^[a-f0-9]{40}$/);
  write(root, 'tracked.txt', 'two');
  const second = worktreeFingerprint(root);
  assert.notEqual(second, first);
  write(root, '.keelson/INTENT.md', 'changed acceptance belongs in the separate fingerprint');
  write(root, 'ignored.txt', 'untracked output');
  assert.equal(worktreeFingerprint(root), second);
  assert.deepEqual(fs.readFileSync(path.join(root, '.git/index')), index);
});

test('a project nested in Git fingerprints its own subtree', () => {
  const root = tmpProject({ 'app/code.js': 'one', 'other.txt': 'outside' });
  execFileSync('git', ['init', '-q'], { cwd: root });
  const nested = path.join(root, 'app');
  const first = worktreeFingerprint(nested);
  write(root, 'other.txt', 'unrelated');
  assert.equal(worktreeFingerprint(nested), first);
  write(root, 'app/code.js', 'two');
  assert.notEqual(worktreeFingerprint(nested), first);
});
