import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalPatch } from '../benchmarks/lib.mjs';

function git(cwd, args) {
  try {
    return { exit_code: 0, stdout: execFileSync('git', args, { cwd, encoding: 'utf8' }), stderr: '' };
  } catch (error) {
    return { exit_code: error.status ?? 1, stdout: error.stdout?.toString() ?? '', stderr: error.stderr?.toString() ?? '' };
  }
}

test('final patch applies tracked modifications and only untracked additions once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-bench-patch-'));
  const source = path.join(root, 'source');
  const target = path.join(root, 'target');
  try {
    fs.mkdirSync(source, { recursive: true });
    git(source, ['init']);
    git(source, ['config', 'user.email', 'benchmark@example.invalid']);
    git(source, ['config', 'user.name', 'benchmark']);
    fs.writeFileSync(path.join(source, 'tracked.txt'), 'before\n');
    git(source, ['add', 'tracked.txt']);
    git(source, ['commit', '-m', 'baseline']);
    git(source, ['branch', 'benchmark-baseline']);
    fs.writeFileSync(path.join(source, 'tracked.txt'), 'after\n');
    git(source, ['add', 'tracked.txt']);
    git(source, ['commit', '-m', 'agent commit']);
    fs.mkdirSync(path.join(source, 'tests'));
    fs.writeFileSync(path.join(source, 'tests', 'new_test.py'), 'assert True\n');
    fs.mkdirSync(path.join(source, '.bench-pydeps'));
    fs.writeFileSync(path.join(source, '.bench-pydeps', 'ignored.txt'), 'ignored\n');
    fs.writeFileSync(path.join(source, '.git', 'info', 'exclude'), '.bench-pydeps/\n');
    const result = finalPatch(source, git);
    assert.deepEqual(result.untracked_paths, ['tests/new_test.py']);
    git(root, ['clone', source, target]);
    git(target, ['checkout', 'benchmark-baseline']);
    fs.writeFileSync(path.join(target, 'result.patch'), result.patch);
    assert.equal(git(target, ['apply', 'result.patch']).exit_code, 0);
    assert.equal(fs.readFileSync(path.join(target, 'tracked.txt'), 'utf8'), 'after\n');
    assert.equal(fs.readFileSync(path.join(target, 'tests', 'new_test.py'), 'utf8'), 'assert True\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
