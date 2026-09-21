import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeDelta, appendDecisions } from '../src/commands/land.js';
import { parseSpec, parseDecisions } from '../src/lib/markdown.js';

const main = `# messaging\n\n## Purpose\nEvents.\n\n## Requirement: Delivery\nold\n### Scenario: s\n- WHEN a\n- THEN b\n\n## Requirement: CSV\ncsv\n\n## Decisions\n- messaging: existing\n`;
const delta = `## ADDED Requirements\n### Requirement: Durable\ndur\n## MODIFIED Requirements\n### Requirement: Delivery\nnew\n## REMOVED Requirements\n### Requirement: CSV\n`;

test('mergeDelta applies removed, modified, added in order', () => {
  const { text, report } = mergeDelta(main, delta, 'messaging');
  const s = parseSpec(text);
  assert.deepEqual(s.requirements.map((r) => r.name), ['Delivery', 'Durable']);
  assert.equal(s.requirements[0].body, 'new');
  assert.deepEqual(report, { added: ['Durable'], modified: ['Delivery'], removed: ['CSV'], missing: [] });
  assert.equal(s.purpose, 'Events.');
  assert.deepEqual(s.decisions, ['messaging: existing']);
});

test('mergeDelta into an empty main creates the spec', () => {
  const { text } = mergeDelta('', `## ADDED Requirements\n### Requirement: X\nx`, 'newcap');
  assert.match(text, /^# newcap/);
  assert.equal(parseSpec(text).requirements[0].name, 'X');
});

test('delta operations never silently reinterpret missing or existing identities', () => {
  for (const delta of [
    '## MODIFIED Requirements\n### Requirement: Delivrey\nnew',
    '## REMOVED Requirements\n### Requirement: Delivrey\n',
    '## ADDED Requirements\n### Requirement: Delivery\nnew',
  ]) assert.throws(() => mergeDelta(main, delta, 'messaging'), /not found|already exists/);
  const { text } = mergeDelta(main, '## MODIFIED Requirements\n### Requirement: Delivery\nreplacement', 'messaging');
  assert.equal(parseSpec(text).requirements.length, 2);
  assert.equal(parseSpec(text).requirements[0].body, 'replacement');
  assert.equal(parseSpec(text).requirements[1].body, 'csv');
});

test('canonical-equivalent Unicode requirement identities are reconciled', () => {
  const original = '# café\n## Requirement: Café\nold';
  const { text } = mergeDelta(original, '## MODIFIED Requirements\n### Requirement: Cafe\u0301\nnew', 'café');
  assert.deepEqual(parseSpec(text).requirements.map((r) => r.body), ['new']);
  assert.throws(() => mergeDelta(original + '\n## Requirement: Cafe\u0301\nconflict', '## ADDED Requirements', 'café'), /duplicate/);
});

test('an unknown operation cannot hide beside a valid delta operation', () => {
  assert.throws(() => mergeDelta(main, '## ADDED Requirements\n### Requirement: New\nnew\n## REPLACED\n### Requirement: Delivery\nreplacement', 'messaging'), /unrecognized requirements section/);
  for (const invalid of ['## REPLACED', '## REPLACED\nreplacement prose', '## REMOVED Requirements\nremove Delivery', '## REMOVED Requirements\n### Wrong heading\nDelivery', '## REMOVED Requirements\n### Requirement: CSV\n### Wrong heading\nDelivery']) {
    assert.throws(() => mergeDelta(main, '## ADDED Requirements\n### Requirement: New\nnew\n'+invalid, 'messaging'), /malformed delta/);
  }
});

test('decisions extraction and folding are idempotent', () => {
  const body = `## Why\nw\n## Decisions\n- messaging: NATS over Kafka; Kafka rejected for cost\n- no prefix line\n- …\n`;
  const d = parseDecisions(body);
  assert.equal(d.length, 2);
  assert.equal(d[0].capability, 'messaging');
  assert.equal(d[1].capability, null);
  const once = appendDecisions(main, 'messaging', [d[0].text]);
  const twice = appendDecisions(once, 'messaging', [d[0].text]);
  assert.equal(once, twice);
  assert.equal(parseSpec(twice).decisions.length, 2);
});
