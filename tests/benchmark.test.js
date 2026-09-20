import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUsage, sourcePaths, summarizeRun, validateTask } from '../benchmarks/lib.mjs';

test('task metadata requires immutable upstream identities and a mechanical threshold', () => {
  const task = validateTask({
    id: 'example', repository: 'https://github.com/example/repo.git',
    baseline_sha: 'a'.repeat(40), upstream_fix_sha: 'b'.repeat(40),
    required_source_files: 1, hidden_test: 'hidden_test.py',
  });
  assert.equal(task.id, 'example');
  assert.throws(() => validateTask({ ...task, baseline_sha: 'short' }), /full SHA/);
  assert.throws(() => validateTask({ ...task, required_source_files: 0 }), /positive integer/);
});

test('only source paths satisfy the source-change threshold and pass remains mechanical', () => {
  assert.deepEqual(sourcePaths(['.agents/skills/a/SKILL.md', 'src/flask/app.py', 'tests/test_app.py']), ['src/flask/app.py']);
  const pass = summarizeRun({
    codexExitCode: 0, publicVerificationExitCode: 0, acceptanceExitCode: 0,
    changedPaths: ['openspec/changes/x.md', 'src/flask/app.py'], requiredSourceFiles: 1,
    elapsedMs: 42, tokens: { input_tokens: 7, output_tokens: 9 },
  });
  assert.equal(pass.pass, true);
  assert.equal(pass.regression_pass, true);
  assert.equal(pass.acceptance_pass, true);
  const failure = summarizeRun({ codexExitCode: 0, publicVerificationExitCode: 2, acceptanceExitCode: 0, changedPaths: ['src/a.py'], requiredSourceFiles: 1, elapsedMs: 42 });
  assert.equal(failure.pass, false);
  assert.equal(failure.regression_pass, false);
  assert.equal(failure.acceptance_pass, true);
  assert.equal(failure.tokens, null);
});

test('token fields are retained only when emitted by raw Codex events', () => {
  assert.deepEqual(findUsage({ type: 'turn.completed', usage: { input_tokens: 10, output_tokens: 2 } }), { input_tokens: 10, output_tokens: 2 });
  assert.equal(findUsage({ type: 'item.completed' }), null);
});
