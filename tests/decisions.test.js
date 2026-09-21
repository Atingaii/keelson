import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpProject, run, write } from './helpers.js';
import { evaluateLifecycle } from '../src/lib/lifecycle.js';

test('legacy confirmation cannot silently settle a structured assumption', () => {
  const change = {
    evidence: { state: 'passed', tree: 'tree' }, depends: [], acceptance: [], acceptanceProgress: { done: 0, total: 0 },
    tier: 'quick', open: [], assumed: [], progress: { done: 0, total: 0 },
    decisionRecords: [{ id: 'D17', state: 'assumed' }],
  };
  const result = evaluateLifecycle(change, 'tree', { confirmAssumptions: true });
  assert.equal(result.gates.find((g) => g.code === 'decisions').pass, false);
  assert.notEqual(result.work, 'ready');
});

test('decision frontier routes ownership, preserves settlement and orders dependencies', (t) => {
  const root = tmpProject({ '.keelson/config.yaml': 'version: 4\n' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, '.keelson/changes/fix/change.md', '---\ntier: quick\n---\n# Fix');
  const ask = (...args) => run(root, ['ask', ...args, '--change', 'fix', '--json'], { allowFail: true });
  for (const id of ['a', 'b', 'c', 'd']) assert.equal(ask('add', id, '--question', `Choose ${id}`).code, 0);
  ask('add', 'fact', '--owner', 'reality', '--question', 'Which API is currently in use?');
  ask('add', 'dependent', '--depends', 'a', '--question', 'Choose downstream behavior');
  let frontier = JSON.parse(ask('frontier').stdout);
  assert.equal(frontier.questions.length, 3);
  assert.equal(frontier.investigate[0].id, 'fact');
  assert.equal(frontier.blocked[0].id, 'dependent');
  assert.notEqual(ask('settle', 'dependent', '--answer', 'yes', '--basis', 'owner').code, 0);
  assert.equal(ask('settle', 'a', '--answer', 'yes', '--basis', 'owner requested yes').code, 0);
  frontier = JSON.parse(ask('frontier').stdout);
  assert.ok(!frontier.questions.some((d) => d.id === 'a'));
  assert.equal(frontier.blocked.length, 0);
  assert.notEqual(ask('settle', 'a', '--answer', 'no', '--basis', 'changed mind').code, 0);
  assert.notEqual(ask('reopen', 'a').code, 0);
  assert.equal(ask('reopen', 'a', '--reason', 'new compatibility constraint').code, 0);
  const data = JSON.parse(ask('list').stdout);
  assert.equal(data.decisions[0].history.at(-1).answer, 'yes');
  assert.equal(data.decisions[0].state, 'open');
  assert.notEqual(ask('add', 'new-id', '--question', 'Choose a').code, 0);
  assert.notEqual(ask('add', 'unknown', '--question', 'Missing premise', '--depends', 'missing').code, 0);
  assert.equal(ask('add', 'danger', '--question', 'Delete data?', '--irreversible').code, 0);
  assert.notEqual(ask('assume', 'danger', '--answer', 'yes', '--basis', 'guess').code, 0);
});

test('malformed decision graphs fail closed without rewriting user data', (t) => {
  const root = tmpProject({ '.keelson/config.yaml': 'version: 4\n' });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, '.keelson/changes/fix/change.md', '---\ntier: quick\n---\n# Fix');
  const file = '.keelson/changes/fix/decisions.json';
  const data = JSON.stringify({ schema: 1, decisions: [
    { id: 'a', owner: 'user', state: 'open', question: 'a?', depends: ['b'], history: [] },
    { id: 'b', owner: 'user', state: 'open', question: 'b?', depends: ['a'], history: [] },
  ] });
  write(root, file, data);
  const result = run(root, ['ask', 'frontier'], { allowFail: true });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /cycle/);
  assert.equal(fs.readFileSync(`${root}/${file}`, 'utf8'), data);
});

test('whole frontier preserves all ready questions and invalid limits never mutate', () => {
  const root = tmpProject({ '.keelson/config.yaml': 'version: 4\n', '.keelson/changes/fix/change.md': '---\ntier: quick\n---\n# Fix' });
  const ask = (...args) => run(root, ['ask', ...args, '--change', 'fix', '--json'], { allowFail: true });
  for (const id of ['a', 'b', 'c', 'd', 'e']) assert.equal(ask('add', id, '--question', `Choose ${id}`).code, 0);
  assert.equal(JSON.parse(ask('frontier', '--all').stdout).questions.length, 5);
  const single = JSON.parse(ask('frontier', '--limit', '1').stdout);
  assert.equal(single.questions.length, 1);
  assert.equal(single.remaining.length, 4);
  assert.equal(single.complete, false);
  const before = ask('list').stdout;
  assert.notEqual(ask('add', 'invalid', '--question', 'Invalid mutation?', '--limit', '0').code, 0);
  assert.equal(ask('list').stdout, before);
});
