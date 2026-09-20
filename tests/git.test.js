import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, write } from './helpers.js';
import { importers, resolveFingerprintPath, worktreeFingerprint } from '../src/lib/git.js';

test('fingerprints include ignored tracked code, exclude Keelson, and preserve the real index', () => {
  const root = tmpProject({ 'tracked.txt': 'one', '.keelson/INTENT.md': 'intent' });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  write(root, '.gitignore', 'tracked.txt\nignored.txt\n');
  const index = fs.readFileSync(path.join(root, '.git/index'));
  const first = worktreeFingerprint(root);
  assert.match(first, /^[a-f0-9]{64}$/);
  write(root, 'tracked.txt', 'two');
  const second = worktreeFingerprint(root);
  assert.notEqual(second, first);
  write(root, '.keelson/INTENT.md', 'changed acceptance belongs in the separate fingerprint');
  write(root, 'ignored.txt', 'untracked output');
  assert.equal(worktreeFingerprint(root), second);
  assert.deepEqual(fs.readFileSync(path.join(root, '.git/index')), index);
});

test('fingerprints direct contents even when Git cannot see a same-mtime same-size edit', () => {
  const root = tmpProject({ 'code.js': 'one' });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  const file = path.join(root, 'code.js');
  const before = worktreeFingerprint(root);
  const stat = fs.statSync(file);
  write(root, 'code.js', 'two'); // Same length as "one".
  fs.utimesSync(file, stat.atime, stat.mtime);
  assert.notEqual(worktreeFingerprint(root), before);
});

test('fingerprints executable mode and symlink targets without following links', (t) => {
  if (process.platform === 'win32') return t.skip('creating file symlinks requires a Windows privilege not assumed by this suite');
  const root = tmpProject({ 'tool.js': 'export default 1;\n' });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  const beforeMode = worktreeFingerprint(root);
  fs.chmodSync(path.join(root, 'tool.js'), 0o755);
  assert.notEqual(worktreeFingerprint(root), beforeMode);
  fs.symlinkSync('tool.js', path.join(root, 'tool-link'));
  const beforeTarget = worktreeFingerprint(root);
  fs.rmSync(path.join(root, 'tool-link'));
  fs.symlinkSync('missing-target', path.join(root, 'tool-link'));
  assert.notEqual(worktreeFingerprint(root), beforeTarget);
});

test('fingerprints deleted tracked files and NUL-delimited Git paths with newlines', () => {
  const files = { 'plain.txt': 'plain' };
  if (process.platform !== 'win32') files['line\nbreak.txt'] = 'one';
  const root = tmpProject(files);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  const beforeDelete = worktreeFingerprint(root);
  fs.rmSync(path.join(root, 'plain.txt'));
  assert.notEqual(worktreeFingerprint(root), beforeDelete);
  if (process.platform === 'win32') return;
  const beforeNewline = worktreeFingerprint(root);
  write(root, 'line\nbreak.txt', 'two');
  assert.notEqual(worktreeFingerprint(root), beforeNewline);
});

test('fingerprints a tracked gitlink by its nested repository HEAD', () => {
  const root = tmpProject({});
  const nested = path.join(root, 'nested');
  fs.mkdirSync(nested);
  const nestedGit = (...args) => execFileSync('git', args, { cwd: nested, encoding: 'utf8' }).trim();
  nestedGit('init', '-q');
  write(nested, 'code.js', 'one');
  nestedGit('add', '.');
  nestedGit('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'first');
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', 'nested');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'gitlink');
  const before = worktreeFingerprint(root);
  write(nested, 'code.js', 'two');
  nestedGit('add', '.');
  nestedGit('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'second');
  assert.notEqual(worktreeFingerprint(root), before);
});

test('Git importer search includes untracked code, excludes ignored code, and treats no match as success', () => {
  const root = tmpProject({
    'src/module.js': 'export const value = 1;\n',
    'src/tracked.js': "import { value } from './module.js';\n",
    'src/untracked.js': "import { value } from './module.js';\n",
    'src/ignored.js': "import { value } from './module.js';\n",
    'src/nimbus.js': 'export const nimbus = 1;\n',
    'src/uses-nimbus.js': "import { nimbus } from './nimbus.js';\n",
    'src/non-boundary.js': "import value from './supernimbus.js';\n",
    '.gitignore': 'src/ignored.js\n',
  });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', 'src/module.js', 'src/tracked.js', 'src/nimbus.js', 'src/uses-nimbus.js', 'src/non-boundary.js', '.gitignore');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  assert.deepEqual(importers(root, ['src/module.js']).sort(), ['src/tracked.js', 'src/untracked.js']);
  assert.deepEqual(importers(root, ['src/nimbus.js']), ['src/uses-nimbus.js']);
  assert.deepEqual(importers(root, ['src/missing.js']), []);
});

test('importer search preserves single-separator syntax and word boundaries with and without Git', () => {
  const files = {
    'nimbus.js': 'export const value = 1;\n',
    'from.py': 'from nimbus import value\n',
    'import.py': 'import nimbus\n',
    'use.rs': 'use nimbus::value;\n',
    'require.js': 'const value = require("nimbus");\n',
    'negative.py': 'import supernimbus\nfrom nimbus_extra import value\n',
  };
  const expected = ['from.py', 'import.py', 'require.js', 'use.rs'];
  for (const useGit of [false, true]) {
    const root = tmpProject(files);
    if (useGit) execFileSync('git', ['init', '-q'], { cwd: root });
    assert.deepEqual(importers(root, ['nimbus.js']).sort(), expected, `Git enabled: ${useGit}`);
  }
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

test('non-Git fallback frames current file contents without timestamp shortcuts', (t) => {
  if (process.platform === 'win32') return t.skip('the newline filename portion of this portable framing regression is POSIX-only');
  const root = tmpProject({ 'plain.txt': 'one', 'line\nbreak.txt': 'alpha' });
  const plain = path.join(root, 'plain.txt');
  const before = worktreeFingerprint(root);
  const stat = fs.statSync(plain);
  write(root, 'plain.txt', 'two');
  fs.utimesSync(plain, stat.atime, stat.mtime);
  assert.notEqual(worktreeFingerprint(root), before);
  const beforeNewline = worktreeFingerprint(root);
  write(root, 'line\nbreak.txt', 'beta');
  assert.notEqual(worktreeFingerprint(root), beforeNewline);
});

test('fingerprints fail closed when a Git worktree has unusable metadata', () => {
  const root = tmpProject({ 'code.js': 'export const value = 1;\n' });
  execFileSync('git', ['init', '-q'], { cwd: root });
  fs.writeFileSync(path.join(root, '.git/config'), '[core\n  repositoryformatversion = 0\n');
  assert.throws(() => worktreeFingerprint(root));

  const corrupt = tmpProject({ 'code.js': 'export const value = 1;\n' });
  execFileSync('git', ['init', '-q'], { cwd: corrupt });
  fs.rmSync(path.join(corrupt, '.git/HEAD'));
  assert.throws(() => worktreeFingerprint(corrupt));
});

test('non-Git fallback accepts Git\'s mount-boundary diagnostic', (t) => {
  if (process.platform === 'win32' || !fs.existsSync('/dev/shm')) return t.skip('the Git mount-boundary diagnostic is POSIX-specific');
  const root = fs.mkdtempSync('/dev/shm/keelson-git-boundary-');
  const outsideGit = path.join('/dev', '.git');
  const originalLstat = fs.lstatSync;
  let inspectedOutsideGit = false;
  try {
    let stderr = '';
    try {
      execFileSync('git', ['ls-files', '-s', '-z'], {
        cwd: root,
        env: { ...process.env, LC_ALL: 'C', LANG: 'C', LANGUAGE: 'C' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      stderr = Buffer.from(error.stderr ?? '').toString('utf8');
    }
    if (!stderr.includes('any parent up to mount point')) return t.skip('this host did not stop Git discovery at /dev/shm');
    fs.lstatSync = (target, ...args) => {
      if (path.resolve(target) === outsideGit) {
        inspectedOutsideGit = true;
        return {};
      }
      return originalLstat(target, ...args);
    };
    assert.match(worktreeFingerprint(root), /^[a-f0-9]{64}$/);
  } finally {
    fs.lstatSync = originalLstat;
    fs.rmSync(root, { recursive: true, force: true });
  }
  assert.equal(inspectedOutsideGit, false);
});

test('untracked tab names remain paths, rather than being parsed as stage metadata', (t) => {
  if (process.platform === 'win32') return t.skip('Win32 filenames cannot contain tab characters');
  const root = tmpProject({ 'tracked.txt': 'one' });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture');
  write(root, 'untracked\tname.txt', 'one');
  const before = worktreeFingerprint(root);
  write(root, 'untracked\tname.txt', 'two');
  assert.notEqual(worktreeFingerprint(root), before);
});


test('fingerprint path resolution accepts a filesystem root and refuses escapes', () => {
  const root = path.parse(process.cwd()).root;
  assert.equal(resolveFingerprintPath(root, Buffer.from('keelson-fingerprint-root-test')), path.join(root, 'keelson-fingerprint-root-test'));
  const project = tmpProject({});
  assert.throws(() => resolveFingerprintPath(project, Buffer.from('../outside')), /outside the project root/);
});
