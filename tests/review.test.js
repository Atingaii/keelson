import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpProject, run, write, read, exists } from './helpers.js';

function fixture() {
  return tmpProject({
    'tasks.js': 'export const priority = 1;\n',
    '.keelson/config.yaml': 'version: 4\ncheck:\n  - node --check tasks.js\n',
    '.keelson/INTENT.md': '# Tasks\nRead-only recommendations.\n',
    '.keelson/specs/tasks/spec.md': '# tasks\n## Requirement: Display\nShow the full list by default.\n## Requirement: Data\nNever rewrite task data.\n',
    '.keelson/changes/focus/change.md': '---\ntier: quick\nstatus: in-progress\n---\n# Focus\n## What\nOnly show the next task.\n## Why\nReduce overload.\n## Acceptance\n- [x] Default output is one task; explicit list preserves all tasks.\n',
    '.keelson/changes/focus/specs/tasks/spec.md': '## MODIFIED Requirements\n### Requirement: Display\nShow one task by default; list preserves the full list.\n',
  });
}

function report(dir) {
  const packet = JSON.parse(run(dir, ['review', '--prepare', 'focus']).stdout);
  const result = packet.reportTemplate;
  result.reviewer = 'isolated test reviewer';
  result.coverage[0].evidence = 'Fixture reviewer compared default and explicit list output.';
  result.counterexamples = [{ case: 'A full default list would retain overload.', result: 'Fixture review inspected the one-item contract and list preservation separately.' }];
  result.contracts[0].evidence = 'Display replaced; Data still requires read-only behavior.';
  return { packet, result };
}
const record = (dir, value) => {
  write(dir, '.keelson/changes/focus/candidate-review.json', JSON.stringify(value));
  return run(dir, ['review', '--change', 'focus', '--record', '.keelson/changes/focus/candidate-review.json'], { allowFail: true });
};
const checks = (dir) => run(dir, ['check', '--trust', '--record', '--quiet']);

test('quick behavioral change needs fresh review in addition to green checks', () => {
  const dir = fixture();
  checks(dir);
  assert.match(run(dir, ['land', 'focus'], { allowFail: true }).stderr, /review/);
  assert.match(run(dir, ['land', 'focus', '--force', '--reason', 'fixture override'], { allowFail: true }).stderr, /cannot be bypassed/);
  assert.equal(exists(dir, '.keelson/changes/focus/change.md'), true);
  const { packet, result } = report(dir);
  assert.match(packet.contracts[0].after, /Show one task/);
  assert.doesNotMatch(packet.contracts[0].after, /Show the full list by default/);
  assert.match(packet.contracts[0].after, /Never rewrite task data/);
  assert.equal(record(dir, result).code, 0);
  assert.match(run(dir, ['land', 'focus'], { allowFail: true }).stderr, /stale/);
  assert.match(run(dir, ['land', 'focus', '--force', '--reason', 'fixture override'], { allowFail: true }).stderr, /verification stale/);
  checks(dir);
  run(dir, ['land', 'focus']);
  assert.match(read(dir, '.keelson/specs/tasks/spec.md'), /Show one task/);
});

test('incomplete coverage, missing counterexamples and unreviewed merged specs are rejected', () => {
  const dir = fixture();
  const { result } = report(dir);
  for (const broken of [
    { ...result, coverage: [] },
    { ...result, coverage: [{ acceptance: 'similar but different requirement', evidence: 'green' }] },
    { ...result, coverage: [...result.coverage, ...result.coverage] },
    { ...result, counterexamples: [] },
    { ...result, contracts: [] },
    { ...result, independent: false },
  ]) assert.notEqual(record(dir, broken).code, 0);
  assert.equal(exists(dir, '.keelson/changes/focus/review.json'), false);
});

test('findings prevent landing and changed inputs invalidate even a previously passing review', () => {
  const dir = fixture();
  let value = report(dir).result;
  assert.equal(record(dir, { ...value, findings: ['Implementation adds an unapproved tie-break.'] }).code, 1);
  checks(dir);
  assert.match(run(dir, ['land', 'focus'], { allowFail: true }).stderr, /tie-break/);
  assert.equal(record(dir, value).code, 0);
  for (const [file, content] of [
    ['tasks.js', 'export const priority = 2;'],
    ['.keelson/changes/focus/request.md', 'Owner explicitly requires stable order.'],
    ['.keelson/specs/tasks/spec.md', '# tasks\n## Requirement: Display\nPrevious display.'],
  ]) {
    write(dir, file, content);
    assert.notEqual(record(dir, value).code, 0);
    checks(dir);
    assert.match(run(dir, ['land', 'focus'], { allowFail: true }).stderr, /review.*stale/s);
    value = report(dir).result;
    assert.equal(record(dir, value).code, 0);
  }
});

test('invalid delta leaves both current truth and active change intact', () => {
  const dir = fixture();
  const before = read(dir, '.keelson/specs/tasks/spec.md');
  write(dir, '.keelson/changes/focus/specs/tasks/spec.md', '## MODIFIED Requirements\n### Requirement: Typo\nnew');
  assert.match(run(dir, ['review', '--prepare'], { allowFail: true }).stderr, /not found/);
  // Even explicit force cannot bypass review to apply an invalid contract.
  assert.match(run(dir, ['land', '--force', '--reason', 'test transactional validation'], { allowFail: true }).stderr, /cannot be bypassed/);
  assert.equal(read(dir, '.keelson/specs/tasks/spec.md'), before);
  assert.equal(exists(dir, '.keelson/changes/focus/change.md'), true);
});

test('multiple deltas in one capability are reviewed as the same final contract land writes', () => {
  const dir = fixture();
  write(dir, '.keelson/changes/focus/specs/tasks/extra.md', '## ADDED Requirements\n### Requirement: Count\nShow unfinished count.\n');
  const { packet, result } = report(dir);
  assert.equal(packet.contracts.length, 1);
  assert.match(packet.contracts[0].after, /Show unfinished count/);
  assert.match(packet.contracts[0].after, /Show one task/);
  assert.equal(record(dir, result).code, 0);
  checks(dir);
  run(dir, ['land', 'focus']);
  assert.equal(read(dir, '.keelson/specs/tasks/spec.md'), packet.contracts[0].after);
});

test('non-behavioral quick work stays lightweight; explicit review policy cannot be bypassed by omitting deltas', () => {
  const dir = tmpProject({
    '.keelson/config.yaml': 'check:\n  - node -e "process.exit(0)"\n',
    '.keelson/changes/wording/change.md': '---\ntier: quick\n---\n# Wording\n## Acceptance\n- [x] Typo corrected.\n',
  });
  checks(dir);
  run(dir, ['land', 'wording']);
  write(dir, '.keelson/changes/logic/change.md', '---\ntier: quick\nreview: independent\n---\n# Logic\n## Acceptance\n- [x] Boundary corrected.\n');
  checks(dir);
  assert.match(run(dir, ['land', 'logic'], { allowFail: true }).stderr, /review/);
});
