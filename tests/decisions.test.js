import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpProject, run, write } from './helpers.js';

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
