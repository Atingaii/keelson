import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fc from 'fast-check';
import { parseTasks, parseSlices, parseAcceptance, parseOpenQuestions, parseDecisions, parseHandoff, parseLedger, parseSpec, parseDelta, renderSpec, parseFrontmatter, sections } from '../src/lib/markdown.js';
import { slugify, planCapabilityStorage, readCapabilitySpec } from '../src/lib/specs.js';

test('parseTasks reads state, id, effort, verify', () => {
  const t = parseTasks(`# Tasks\n- [ ] 1. Add thing (effort: light) — verify: \`npm test -- a\`\n- [x] 2.1 Other (effort: deep)\n- plain bullet`);
  assert.equal(t.length, 2);
  assert.deepEqual([t[0].id, t[0].done, t[0].effort, t[0].verify, t[0].title], ['1', false, 'light', 'npm test -- a', 'Add thing']);
  assert.deepEqual([t[1].id, t[1].done, t[1].effort, t[1].verify], ['2.1', true, 'deep', null]);
});

test('parseLedger classifies entries', () => {
  const l = parseLedger(`# L\n\n### Ruling: ack\nbody\n\n### Root cause: guessed-fix\nx\n\n### Verify: e2e\n\`npm test\` exit 0\n\n### Dispatch: task 2 → light (haiku)\nResult: fail\nreviewer rejected.\n\n### Escalate: task 2 light -> standard\nwhy`);
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

test('spec parser supports legacy and nested requirement layouts without reading fenced examples', () => {
  const source = `# 支付\r\n\r\n## Notes\r\n\r\n\`\`\`md\r\n## Requirement: not real\r\n### Scenario: not real\r\n\`\`\`\r\n\r\n## Requirements\r\n\r\n### Requirement: 退款\r\n\r\n系统 SHALL 退款。\r\n\r\n#### Scenario: 已支付订单\r\n- WHEN 已支付\r\n- THEN 退款\r\n\r\n## Requirement: Legacy\r\n\r\nThe system SHALL keep compatibility.\r\n\r\n### Scenario: old client\r\n- WHEN it calls\r\n- THEN it works\r\n`;
  const spec = parseSpec(source);
  assert.deepEqual(spec.requirements.map((r) => r.name), ['退款', 'Legacy']);
  assert.equal(renderSpec(spec), source.replace(/\r\n/g, '\n'));
  assert.equal(sections(source, 2).some((s) => s.title === 'Requirement: not real'), false);
});

test('spec parse/render property preserves Unicode, CRLF, unknown sections, and fenced headings', () => {
  const word = fc.array(fc.constantFrom('支付', 'café', 'Δ', '🧪', 'alpha'), { minLength: 1, maxLength: 5 }).map((parts) => parts.join(' '));
  fc.assert(fc.property(word, word, (requirement, note) => {
    const lf = `# ${requirement}\n\n## Context\n\n${note}\n\n\`\`\`markdown\n## Requirement: ignored\n### Scenario: ignored\n\`\`\`\n\n## Requirements\n\n### Requirement: ${requirement}\n\nThe system SHALL preserve text.\n\n#### Scenario: ${note}\n- WHEN input is supplied\n- THEN it is retained\n\n## Appendix\n\n${note}\n`;
    const crlf = lf.replace(/\n/g, '\r\n');
    const parsed = parseSpec(crlf);
    assert.equal(parsed.requirements.length, 1);
    assert.equal(renderSpec(parsed), lf);
  }), { numRuns: 75 });
});

test('spec updates preserve foreign sections, frontmatter, and fenced Markdown', () => {
  const source = `---
owner: 团队
---
# checkout

## Context

Keep this paragraph.

\`\`\`md
## Requirement: fake
\`\`\`

## Requirements

### Requirement: Pay

Old text.

#### Scenario: works
- WHEN pay
- THEN receipt

### Notes

nested notes.

## Appendix

Keep appendix.

## Decisions

- checkout: existing
`;
  const parsed = parseSpec(source);
  const updated = renderSpec({
    ...parsed,
    requirements: [
      { name: 'Pay', body: 'New text.\n\n### Scenario: works\n- WHEN pay\n- THEN receipt' },
      { name: 'Refund', body: 'The system SHALL refund.' },
    ],
    decisions: [...parsed.decisions, 'checkout: preserve custom Markdown'],
  });
  assert.match(updated, /owner: 团队/);
  assert.match(updated, /## Context\n\nKeep this paragraph\./);
  assert.match(updated, /```md\n## Requirement: fake\n```/);
  assert.match(updated, /### Notes\n\nnested notes\./);
  assert.match(updated, /## Appendix\n\nKeep appendix\./);
  assert.deepEqual(parseSpec(updated).requirements.map((r) => r.name), ['Pay', 'Refund']);
  assert.deepEqual(parseSpec(updated).decisions, ['checkout: existing', 'checkout: preserve custom Markdown']);

  const removed = renderSpec({ ...parsed, requirements: [] });
  assert.doesNotMatch(removed, /### Requirement: Pay/);
  assert.match(removed, /### Notes\n\nnested notes\./);
  assert.match(removed, /## Appendix\n\nKeep appendix\./);
});

test('sharding keeps a source with unmanaged Markdown as a single file', () => {
  const source = `---
owner: platform
---
# checkout

## Requirement: Pay

The system SHALL pay.

## Appendix

This text must survive.
`;
  const plan = planCapabilityStorage('checkout', source, 3);
  assert.equal(plan.mode, 'single');
  assert.equal(plan.logicalText, source);
});

test('sharding accepts harmless layout differences in fully managed sections', () => {
  const source = `# orders

## Requirement: Existing
old
### Scenario: existing
- WHEN old
- THEN kept

## Purpose
Orders.

## Decisions
- orders: keep the bounded representation
`;
  const plan = planCapabilityStorage('orders', source, 3);
  assert.equal(plan.mode, 'sharded');
  assert.equal(plan.requirementsDir, 'requirements');
  assert.equal(plan.decisionsDir, 'decisions');
  assert.ok(plan.files.some((file) => file.rel === 'requirements/existing.md'));
  assert.ok(plan.files.some((file) => file.rel.startsWith('decisions/')));
});

test('shard metadata cannot escape or traverse a symlinked capability directory', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-shard-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const specs = path.join(root, 'specs');
  const cap = path.join(specs, 'checkout');
  fs.mkdirSync(cap, { recursive: true });
  fs.writeFileSync(path.join(cap, 'spec.md'), '---\nlayout: sharded\nrequirements_dir: ../outside\n---\n# checkout\n');
  assert.throws(() => readCapabilitySpec(specs, 'checkout'), /escapes its root/);

  const outside = path.join(root, 'outside');
  fs.mkdirSync(outside);
  fs.rmSync(cap, { recursive: true });
  fs.symlinkSync(outside, cap, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => readCapabilitySpec(specs, 'checkout'), /must not be a symlink/);
  assert.throws(() => readCapabilitySpec(specs, 'checkout/nested'), /must not be a symlink/);
  assert.throws(() => readCapabilitySpec(specs, '../outside'), /escapes/);
});

test('Unicode requirement names produce distinct readable storage slugs', () => {
  assert.equal(slugify('Déploiement 支付 🧪'), 'deploiement-支付');
  assert.equal(slugify('Δοκιμή'), 'δοκιμη');
});

test('parseDelta reads all three sections and normalises scenario depth', () => {
  const d = parseDelta(`## ADDED Requirements\n### Requirement: N\nbody\n#### Scenario: z\n- WHEN\n## MODIFIED Requirements\n### Requirement: M\nm\n## REMOVED Requirements\n### Requirement: R`);
  assert.equal(d.added[0].name, 'N');
  assert.match(d.added[0].body, /^### Scenario: z/m);
  assert.equal(d.modified[0].name, 'M');
  assert.equal(d.removed[0].name, 'R');
});

test('parseDelta ignores fenced requirements and reports malformed sections', () => {
  const delta = parseDelta(`## ADDED Requirements\n\`\`\`md\n### Requirement: ignored\n\`\`\`\n\n### Requirement: Real\nbody\n#### Scenario: real\n- WHEN\n- THEN\n\n## NOTED Requirements\n### Requirement: wrong place\n`);
  assert.deepEqual(delta.added.map((r) => r.name), ['Real']);
  assert.match(delta.added[0].body, /^### Scenario: real/m);
  assert.deepEqual(delta.issues, ['unrecognized requirements section "NOTED Requirements"']);
});

test('parseDelta flags prose-only ADDED and MODIFIED sections but permits empty no-ops', () => {
  const malformed = parseDelta(`## ADDED Requirements
Explain the change here.

## MODIFIED Requirements
### Scenario: misplaced
- WHEN x
`);
  assert.deepEqual(malformed.issues, [
    'ADDED Requirements has content but no Requirement sections',
    'MODIFIED Requirements has content but no Requirement sections',
  ]);
  assert.deepEqual(parseDelta('## ADDED Requirements\n\n## MODIFIED Requirements\n').issues, []);
});

test('frontmatter and sections', () => {
  const { data, body } = parseFrontmatter(`---\ntier: spec\ncreated: 2026-01-01\n---\n# T\n\n## Why\nw\n## What\n- x`);
  assert.equal(data.tier, 'spec');
  assert.deepEqual(sections(body).map((s) => s.title), ['Why', 'What']);
});

test('markdown parsers treat CRLF and LF as the same document', () => {
  const lf = '---\ntier: spec\ncreated: 2026-01-01\n---\n# T\n\n## Why\nw\n## What\n- x\n';
  const crlf = lf.replace(/\n/g, '\r\n');
  assert.deepEqual(parseFrontmatter(crlf), parseFrontmatter(lf));
  assert.deepEqual(sections(crlf), sections(lf));

  const handoffLf = '---\nat: abc1234\nupdated: 2026-01-01 10:00\nby: Ann\n---\n# H\n## Next step\nDo the thing.\n## Verification\nnone\n';
  assert.deepEqual(parseHandoff(handoffLf.replace(/\n/g, '\r\n')), parseHandoff(handoffLf));

  const tasksLf = '## Slice: Paging\nDelivers: pages work\n- [x] 1. Add it (effort: light) — verify: `npm test`\n';
  assert.deepEqual(parseTasks(tasksLf.replace(/\n/g, '\r\n')), parseTasks(tasksLf));
  assert.deepEqual(parseSlices(tasksLf.replace(/\n/g, '\r\n')), parseSlices(tasksLf));
});

test('parseTasks keeps the title clean when prose follows the verify command', () => {
  const [t] = parseTasks('- [x] 2. Add the branch (effort: light) — verify: `keelson check` plus a smoke run against `TODO_FILE`');
  assert.equal(t.title, 'Add the branch');
  assert.equal(t.verify, 'keelson check');
  const [u] = parseTasks('- [ ] 3. Review — verify: `npm test` (effort: deep)');
  assert.equal(u.title, 'Review');
  assert.equal(u.effort, 'deep');
});

test('dispatch result comes only from the Result line', () => {
  const [a, b] = parseLedger(`### Dispatch: task 3 → deep (fable)\nReviewer named its rejected option; no blockers.\n\n### Dispatch: task 4 → light (haiku)\nResult: pass\nfailed attempts earlier were retried.`);
  assert.equal(a.result, null);
  assert.equal(b.result, 'pass');
});

test('slices, acceptance, open questions, decision states, handoff parse; placeholders are ignored', () => {
  const tasks = '## Slice: …\nDelivers: …\n- [ ] 1. x (effort: light)\n\n## Slice: Paging\nDelivers: pages work\n- [x] 2. y (effort: deep)\n';
  assert.deepEqual(parseSlices(tasks), [{ name: 'Paging', delivers: 'pages work', done: 1, total: 1 }]);
  assert.equal(parseTasks(tasks)[0].slice, null);
  assert.equal(parseTasks(tasks)[1].slice, 'Paging');
  const body = '## Acceptance\n- [ ] … — test: `…`\n- [x] links open — test: share.create\n- [ ] expired links refuse — manual: open one\n## Open questions\n- … — blocks: <slice>\n- public download? — blocks: Download, Page\n## Decisions\n- {{capability}}: …\n- (assumed) share: expires in 7 days\n- share: tokens are random; sequential rejected\n';
  assert.deepEqual(parseAcceptance(body).map((a) => [a.done, a.kind]), [[true, 'test'], [false, 'manual']]);
  assert.deepEqual(parseOpenQuestions(body), [{ text: 'public download?', blocks: ['Download', 'Page'] }]);
  assert.deepEqual(parseDecisions(body).map((d) => d.state), ['assumed', 'confirmed']);
  const h = parseHandoff('---\nat: abc1234\nupdated: 2026-01-01 10:00\nby: Ann\n---\n# H\n## Next step\nDo the thing.\n## Verification\nnone\n');
  assert.deepEqual([h.at, h.by, h.next], ['abc1234', 'Ann', 'Do the thing.']);
});

test('verify entries carry the worktree tree hash', () => {
  const [v] = parseLedger('### Verify: e2e\n`npm test` exit 0; `npm run lint` exit 2 · tree 5bcb829dae\n');
  assert.deepEqual([v.exit, v.tree, v.command], [2, '5bcb829dae', 'npm test']);
});
