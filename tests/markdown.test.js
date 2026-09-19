import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTasks, parseLedger, parseSpec, parseDelta, renderSpec, parseFrontmatter, sections } from '../src/lib/markdown.js';

test('parseTasks reads state, id, effort, verify', () => {
  const t = parseTasks(`# Tasks\n- [ ] 1. Add thing (effort: light) — verify: \`npm test -- a\`\n- [x] 2.1 Other (effort: deep)\n- plain bullet`);
  assert.equal(t.length, 2);
  assert.deepEqual([t[0].id, t[0].done, t[0].effort, t[0].verify, t[0].title], ['1', false, 'light', 'npm test -- a', 'Add thing']);
  assert.deepEqual([t[1].id, t[1].done, t[1].effort, t[1].verify], ['2.1', true, 'deep', null]);
});

test('parseLedger classifies entries', () => {
  const l = parseLedger(`# L\n\n### Ruling: ack\nbody\n\n### Root cause: guessed-fix\nx\n\n### Verify: e2e\n\`npm test\` exit 0\n\n### Dispatch: task 2 → light (haiku)\nreviewer rejected. failed\n\n### Escalate: task 2 light -> standard\nwhy`);
  assert.deepEqual(l.map((e) => e.kind), ['ruling', 'root-cause', 'verify', 'dispatch', 'escalate']);
  assert.equal(l[1].category, 'guessed-fix');
  assert.equal(l[2].exit, 0);
  assert.equal(l[2].command, 'npm test');
  assert.deepEqual([l[3].tier, l[3].task, l[3].result], ['light', '2', 'fail']);
  assert.deepEqual([l[4].from, l[4].to], ['light', 'standard']);
});

test('spec round-trips through parse/render', () => {
  const src = `# cap\n\n## Purpose\n\nDoes things.\n\n## Requirement: A\n\nThe system SHALL a.\n### Scenario: s\n- WHEN x\n- THEN y\n\n## Decisions\n\n- cap: chose a over b\n`;
  const s = parseSpec(src);
  assert.equal(s.requirements.length, 1);
  assert.equal(s.decisions[0], 'cap: chose a over b');
  const again = parseSpec(renderSpec({ name: 'cap', ...s }));
  assert.deepEqual(again.requirements, s.requirements);
  assert.deepEqual(again.decisions, s.decisions);
});

test('parseDelta reads all three sections and normalises scenario depth', () => {
  const d = parseDelta(`## ADDED Requirements\n### Requirement: N\nbody\n#### Scenario: z\n- WHEN\n## MODIFIED Requirements\n### Requirement: M\nm\n## REMOVED Requirements\n### Requirement: R`);
  assert.equal(d.added[0].name, 'N');
  assert.match(d.added[0].body, /^### Scenario: z/m);
  assert.equal(d.modified[0].name, 'M');
  assert.equal(d.removed[0].name, 'R');
});

test('frontmatter and sections', () => {
  const { data, body } = parseFrontmatter(`---\ntier: spec\ncreated: 2026-01-01\n---\n# T\n\n## Why\nw\n## What\n- x`);
  assert.equal(data.tier, 'spec');
  assert.deepEqual(sections(body).map((s) => s.title), ['Why', 'What']);
});

test('parseTasks keeps the title clean when prose follows the verify command', () => {
  const [t] = parseTasks('- [x] 2. Add the branch (effort: light) — verify: `keelson check` plus a smoke run against `TODO_FILE`');
  assert.equal(t.title, 'Add the branch');
  assert.equal(t.verify, 'keelson check');
  const [u] = parseTasks('- [ ] 3. Review — verify: `npm test` (effort: deep)');
  assert.equal(u.title, 'Review');
  assert.equal(u.effort, 'deep');
});
