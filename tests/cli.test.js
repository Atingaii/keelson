import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpProject, run, read, exists, write } from './helpers.js';

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-home-'));
const env = { HOME };

test('init creates .keelson, skill, resident block, hooks; update is idempotent', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x","scripts":{"test":"echo ok"}}', 'CLAUDE.md': '# Mine\n' });
  run(dir, ['init', '--tools', 'claude,cursor'], { env });
  for (const f of ['.keelson/INTENT.md', '.keelson/NOW.md', '.keelson/config.yaml', '.keelson/rules/index.md', '.keelson/rules/general.md', '.keelson/hooks/session-start.mjs', '.claude/skills/keelson/SKILL.md', '.claude/skills/keelson/references/build.md', '.agents/skills/keelson/SKILL.md', '.cursor/rules/keelson.mdc', 'AGENTS.md']) assert.ok(exists(dir, f), f);
  assert.ok(!exists(dir, '.claude/skills/keelson/templates'), 'templates are not installed into the skill');
  const claude = read(dir, 'CLAUDE.md');
  assert.match(claude, /^# Mine/);
  assert.equal((claude.match(/keelson:start/g) || []).length, 1);
  assert.match(read(dir, '.keelson/config.yaml'), /- npm run test/);
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(settings.hooks.SessionStart.length, 1);
  assert.equal(settings.hooks.UserPromptSubmit.length, 1);
  run(dir, ['update'], { env });
  assert.equal((read(dir, 'CLAUDE.md').match(/keelson:start/g) || []).length, 1);
  assert.equal(JSON.parse(read(dir, '.claude/settings.json')).hooks.SessionStart.length, 1);
  // lean profile strips guided blocks
  assert.doesNotMatch(read(dir, '.claude/skills/keelson/references/build.md'), /guided/);
});

test('guided profile keeps guided blocks; lang zh installs the Chinese skill when present', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--profile', 'guided', '--no-hooks'], { env });
  assert.match(read(dir, '.claude/skills/keelson/references/build.md'), /Test-first when behaviour is specified/);
  assert.ok(!exists(dir, '.claude/settings.json'));
});

test('change lifecycle: new → gates → check --record → land folds specs and decisions', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x","scripts":{"test":"echo ok"}}' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/INTENT.md', '# x\n\n## Why this exists\nReal text.\n');
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: Listing\nlists\n### Scenario: s\n- WHEN a\n- THEN b\n');
  run(dir, ['new', 'Add pagination', '--tier', 'spec', '--capability', 'orders', '--touches', 'src/api/**'], { env });
  const front = read(dir, '.keelson/changes/add-pagination/change.md');
  assert.match(front, /^status: clarifying$/m);
  assert.match(front, /^owner: /m);
  assert.match(front, /^touches: \[src\/api\/\*\*\]$/m);
  assert.match(read(dir, '.keelson/changes/add-pagination/specs/orders/spec.md'), /^base: [0-9a-f]{10}$/m);
  write(dir, '.keelson/changes/add-pagination/change.md', `---\ntier: spec\ncreated: 2026-01-01\nstatus: in-progress\n---\n# Add pagination\n\n## Why\nw\n\n## What\n- x\n\n## How\nh\n\n## Alternatives\n- **offset (chosen)** — a\n- **cursor** — strongest: b. Rejected because: c\n\n## Impact\n- i\n\n## Acceptance\n- [ ] default page is 20 — test: orders.default\n\n## Open questions\n- clamp or reject oversized pages? — blocks: Limits\n\n## Decisions\n- orders: offset pagination over cursor; cursor rejected because page jumps are required\n- (assumed) orders: oversized pages are clamped\n`);
  write(dir, '.keelson/changes/add-pagination/specs/orders/spec.md', `---\nbase: ${read(dir, '.keelson/changes/add-pagination/specs/orders/spec.md').match(/^base: (\S+)/m)[1]}\n---\n## ADDED Requirements\n### Requirement: Page size\nThe API SHALL cap size at 200.\n#### Scenario: big\n- WHEN size=500\n- THEN 400\n`);
  write(dir, '.keelson/changes/add-pagination/tasks.md', '# Tasks\n\n## Slice: Paging\nDelivers: pages work\n- [ ] 1. Do it (effort: light) — verify: `echo ok`\n');
  write(dir, '.keelson/changes/add-pagination/ledger.md', '# Ledger\n');
  assert.equal(JSON.parse(run(dir, ['validate', '--json'], { env }).stdout).ok, true);
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0];
  assert.equal(st.work, 'in-progress');
  assert.equal(st.verification.state, 'not-run');
  assert.equal(st.slices[0].name, 'Paging');
  assert.equal(st.open[0].blocks[0], 'Limits');
  // every gate fires
  const refused = run(dir, ['land'], { env, allowFail: true });
  assert.equal(refused.code, 1);
  for (const re of [/task\(s\) unchecked/, /acceptance item\(s\) unchecked/, /open question/, /verification not-run/, /assumed decision/]) assert.match(refused.stderr, re);
  // finish the work
  write(dir, '.keelson/changes/add-pagination/tasks.md', '# Tasks\n\n## Slice: Paging\nDelivers: pages work\n- [x] 1. Do it (effort: light) — verify: `echo ok`\n');
  let cm = read(dir, '.keelson/changes/add-pagination/change.md').replace('- [ ] default', '- [x] default').replace(/## Open questions\n- [^\n]+\n/, '## Open questions\n- none\n');
  write(dir, '.keelson/changes/add-pagination/change.md', cm);
  const rec = run(dir, ['check', '--record', 'pagination', '--quiet'], { env });
  assert.match(rec.stdout, /recorded in/);
  assert.match(read(dir, '.keelson/changes/add-pagination/ledger.md'), /### Verify: pagination\n`npm run test` exit 0 · tree [0-9a-f]{10}/);
  assert.ok(fs.readdirSync(path.join(dir, '.keelson/.local/evidence')).length >= 1);
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].verification.state, 'passed');
  const onlyAssumed = run(dir, ['land'], { env, allowFail: true });
  assert.match(onlyAssumed.stderr, /assumed decision/);
  assert.doesNotMatch(onlyAssumed.stderr, /unchecked|open question|verification/);
  // code edit → stale
  write(dir, 'src/x.js', 'export const x = 1;\n');
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].verification.state, 'stale');
  assert.match(run(dir, ['land', '--confirm-assumptions'], { env, allowFail: true }).stderr, /verification stale/);
  run(dir, ['check', '--record', 'after edit', '--quiet'], { env });
  // main spec moved → drift
  write(dir, '.keelson/specs/orders/spec.md', read(dir, '.keelson/specs/orders/spec.md') + '\n## Requirement: Extra\nx\n### Scenario: y\n- WHEN\n- THEN\n');
  assert.match(run(dir, ['land', '--confirm-assumptions'], { env, allowFail: true }).stderr, /changed since this delta was written/);
  run(dir, ['land', '--confirm-assumptions', '--accept-drift', '--now', '# Now\n\nNothing in flight.'], { env });
  assert.ok(!exists(dir, '.keelson/changes/add-pagination'));
  const spec = read(dir, '.keelson/specs/orders/spec.md');
  assert.match(spec, /## Requirement: Page size/);
  assert.match(spec, /## Requirement: Extra/);
  assert.match(spec, /- orders: offset pagination over cursor/);
  assert.match(spec, /- orders: oversized pages are clamped/);
  assert.match(read(dir, '.keelson/NOW.md'), /Nothing in flight/);
  assert.equal((read(dir, '.keelson/NOW.md').match(/^# Now$/gm) || []).length, 1);
});

test('land --keep archives instead of folding', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'tidy', '--tier', 'quick'], { env });
  write(dir, '.keelson/changes/tidy/tasks.md', '- [x] 1. a (effort: light)\n');
  write(dir, '.keelson/changes/tidy/change.md', read(dir, '.keelson/changes/tidy/change.md').replace(/## Acceptance[\s\S]*$/, '## Acceptance\n- [x] done — check: `true`\n'));
  write(dir, '.keelson/changes/tidy/ledger.md', '### Verify: ok\n`true` exit 0\n');
  run(dir, ['land', 'tidy', '--keep'], { env });
  assert.match(read(dir, path.join('.keelson/changes/archive', fs.readdirSync(path.join(dir, '.keelson/changes/archive'))[0], 'change.md')), /^status: integrated$/m);
  const archived = fs.readdirSync(path.join(dir, '.keelson/changes/archive'));
  assert.equal(archived.length, 1);
  assert.match(archived[0], /^\d{4}-\d{2}-\d{2}-tidy$/);
});

test('validate catches dated model IDs, bad tiers, missing rule files', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/rules/index.md', '- `**` → nope.md\n');
  run(dir, ['new', 'bad', '--tier', 'quick'], { env });
  write(dir, '.keelson/changes/bad/tasks.md', '- [ ] 1. x (effort: light)\n');
  write(dir, '.keelson/changes/bad/ledger.md', '### Note: use claude-sonnet-4-20250514 for this\n');
  const r = run(dir, ['validate', '--json'], { env, allowFail: true });
  assert.equal(r.code, 1);
  const { errors } = JSON.parse(r.stdout);
  assert.ok(errors.some((e) => /dated model ID/.test(e)));
  assert.ok(errors.some((e) => /missing file: nope.md/.test(e)));
});

test('context routes rules by path', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/rules/index.md', '- `**` → general.md\n- `src/api/**` → api.md\n');
  write(dir, '.keelson/rules/api.md', '# API\n- envelope\n');
  const hit = run(dir, ['context', '--paths', 'src/api/x.js'], { env }).stdout;
  assert.match(hit, /rules\/api.md/);
  const miss = run(dir, ['context', '--paths', 'src/web/x.js'], { env }).stdout;
  assert.doesNotMatch(miss, /rules\/api.md/);
  assert.match(miss, /rules\/general.md/);
  const j = JSON.parse(run(dir, ['context', '--json'], { env }).stdout);
  assert.equal(j.rules.length, 1);
});

test('check runs configured commands and reports exit codes', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', 'check:\n  - "exit 0"\n  - "exit 3"\n');
  const r = run(dir, ['check', '--quiet', '--json'], { env, allowFail: true });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /`exit 3` exit 3/);
});

test('hooks print a snapshot and a one-line state', () => {
  const dir = tmpProject({});
  run(dir, ['init'], { env });
  const snap = execFileSync('node', [path.join(dir, '.keelson/hooks/session-start.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(snap, /\[keelson\]/);
  assert.match(snap, /Active changes: none/);
  const empty = execFileSync('node', [path.join(dir, '.keelson/hooks/prompt-state.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.equal(empty, '');
  run(dir, ['new', 'thing'], { env });
  const line = execFileSync('node', [path.join(dir, '.keelson/hooks/prompt-state.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(line, /^\[keelson\] active: thing · in-progress · verify not-run · 0\/2 tasks\n$/);
});

test('ablate removes every surface and restore brings it back byte-for-byte', () => {
  const dir = tmpProject({ 'CLAUDE.md': '# Mine\n' });
  run(dir, ['init'], { env });
  const before = read(dir, 'CLAUDE.md');
  run(dir, ['ablate'], { env });
  assert.ok(!exists(dir, '.keelson'));
  assert.ok(!exists(dir, '.claude/skills/keelson'));
  assert.equal(read(dir, 'CLAUDE.md'), '# Mine\n');
  run(dir, ['restore'], { env });
  assert.equal(read(dir, 'CLAUDE.md'), before);
  assert.ok(exists(dir, '.keelson/config.yaml'));
});

test('models resolves tiers and rank writes user overrides', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  assert.equal(run(dir, ['models', '--resolve', 'light'], { env }).stdout.trim(), 'haiku');
  run(dir, ['models', 'rank', 'fable', 'deep'], { env });
  assert.equal(run(dir, ['models', '--resolve', 'deep'], { env }).stdout.trim(), 'fable');
  const bad = run(dir, ['models', 'rank', 'claude-opus-4-20250514', 'deep'], { env, allowFail: true });
  assert.equal(bad.code, 1);
});

test('retro reads ledgers and reports metrics', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'r'], { env });
  write(dir, '.keelson/changes/r/ledger.md', '### Root cause: cross-layer\nx\n### Root cause: cross-layer\ny\n### Root cause: cross-layer\nz\n### Dispatch: task 1 → light (h)\nResult: pass\n');
  const j = JSON.parse(run(dir, ['retro', '--json'], { env }).stdout);
  assert.equal(j.metrics.rootCauses['cross-layer'], 3);
  assert.equal(j.metrics.byTier.light.dispatches, 1);
  assert.ok(j.suggestions.some((s) => s.kind === 'rule'));
  assert.ok(j.guidance.some((g) => g.id === 'debug.reproduce-first'));
});


test('the user-level ~/.keelson is never mistaken for a project root', async () => {
  const { findProjectRoot } = await import('../src/lib/paths.js');
  const home = tmpProject({ '.keelson/models.cache.json': '{}' });
  const nested = path.join(home, 'work', 'proj');
  fs.mkdirSync(nested, { recursive: true });
  const prev = process.env.HOME;
  process.env.HOME = home;
  try {
    assert.equal(findProjectRoot(nested), null);
  } finally {
    process.env.HOME = prev;
  }
});

test('per-command --help prints that command only', () => {
  const dir = tmpProject({});
  const out = run(dir, ['new', '--help'], { env }).stdout;
  assert.match(out, /^Usage: keelson new <name>/);
  assert.doesNotMatch(out, /keelson land/);
});

test('init references existing project material and ignores .keelson/.local', () => {
  const dir = tmpProject({ 'docs/adr/0001.md': '# ADR', 'ARCHITECTURE.md': '# arch', '.github/workflows/ci.yml': 'x', '.gitignore': 'node_modules\n' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['remote', 'add', 'origin', 'git@github.com:acme/shop.git'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /^version: 3$/m);
  assert.match(cfg, /decisions: docs\/adr/);
  assert.match(cfg, /architecture: ARCHITECTURE\.md/);
  assert.match(cfg, /tasks: https:\/\/github\.com\/acme\/shop\/issues/);
  assert.match(cfg, /ci: \.github\/workflows/);
  assert.match(read(dir, '.gitignore'), /^node_modules\n[\s\S]*\.keelson\/\.local\/$/m);
  assert.ok(exists(dir, '.keelson/ROADMAP.md'));
  const ctx = run(dir, ['context'], { env }).stdout;
  assert.match(ctx, /Existing project material[\s\S]*decisions: docs\/adr/);
  assert.match(read(dir, '.claude/skills/keelson/SKILL.md'), /^version: \d+\.\d+\.\d+$/m);
});

test('update migrates a v1 config and --dry-run writes nothing', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', 'version: 1\ntools:\n  - claude\ncheck:\n  - echo hi\n');
  const dry = run(dir, ['update', '--dry-run'], { env }).stdout;
  assert.match(dry, /migrate\s+\.keelson\/config\.yaml v1 → v3/);
  assert.match(read(dir, '.keelson/config.yaml'), /^version: 1$/m);
  run(dir, ['update'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /^version: 3$/m);
  assert.match(cfg, /- echo hi/);
  assert.match(cfg, /budgets:/);
  assert.match(cfg, /specs: \.keelson\/specs/);
});

test('status exposes shared contracts and impact lists importers', () => {
  const dir = tmpProject({ 'src/api/orders.js': 'export const a = 1;\n', 'src/web.js': "import { a } from './api/orders.js';\n" });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: L\nl\n### Scenario: s\n- WHEN\n- THEN\n');
  run(dir, ['new', 'a', '--tier', 'spec', '--capability', 'orders'], { env });
  run(dir, ['new', 'b', '--tier', 'spec', '--capability', 'orders'], { env });
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout);
  assert.equal(st.conflicts.length, 1);
  assert.deepEqual(st.conflicts[0].capabilities, ['orders']);
  const im = JSON.parse(run(dir, ['impact', 'src/api/orders.js', '--json'], { env }).stdout);
  assert.deepEqual(im.callers, ['src/web.js']);
  assert.equal(im.specs[0].capability, 'orders');
  assert.equal(im.activeChanges.length, 2);
});

test('handoff stamps at/updated/by and the session hook prints its next step', () => {
  const dir = tmpProject({});
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'init'], { cwd: dir });
  run(dir, ['init'], { env });
  run(dir, ['new', 'share-links'], { env });
  run(dir, ['handoff', 'share-links', '--by', 'Ann'], { env });
  const h = read(dir, '.keelson/changes/share-links/handoff.md');
  assert.match(h, /^at: [0-9a-f]{7,}$/m);
  assert.match(h, /^by: Ann$/m);
  write(dir, '.keelson/changes/share-links/handoff.md', h.replace(/## Next step\n…/, '## Next step\nWire the revoke endpoint.'));
  const snap = execFileSync('node', [path.join(dir, '.keelson/hooks/session-start.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(snap, /share-links handoff → next: Wire the revoke endpoint\./);
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0];
  assert.equal(st.handoff.headMoved, false);
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'moved'], { cwd: dir });
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].handoff.headMoved, true);
});

test('cancel archives without merging; doctor and uninstall behave', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x"}' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init'], { env });
  write(dir, '.keelson/INTENT.md', '# x\n\n## Why this exists\nReal.\n');
  run(dir, ['new', 'dead-end', '--tier', 'spec', '--capability', 'orders'], { env });
  run(dir, ['cancel', 'dead-end', '--reason', 'superseded'], { env });
  const arch = fs.readdirSync(path.join(dir, '.keelson/changes/archive'));
  assert.match(arch[0], /-dead-end-cancelled$/);
  assert.match(read(dir, `.keelson/changes/archive/${arch[0]}/change.md`), /^status: cancelled$/m);
  assert.ok(!exists(dir, '.keelson/specs/orders/spec.md'));
  const doc = run(dir, ['doctor', '--json'], { env, allowFail: true });
  assert.equal(doc.code, 0, doc.stdout + doc.stderr);
  run(dir, ['uninstall'], { env });
  assert.ok(!exists(dir, '.claude/skills/keelson'));
  assert.ok(exists(dir, '.keelson/INTENT.md'));
  assert.doesNotMatch(read(dir, 'CLAUDE.md'), /keelson:start/);
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['uninstall', '--purge'], { env });
  assert.ok(!exists(dir, '.keelson'));
});

test('breaking change without Rollout is refused at landing', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'drop-v1'], { env });
  write(dir, '.keelson/changes/drop-v1/change.md', '---\ntier: quick\ncreated: 2026-01-01\n---\n# Drop v1\n\n## Why\nw\n\n## What\n- **BREAKING** remove /v1\n\n## Acceptance\n- [x] gone — check: `true`\n');
  write(dir, '.keelson/changes/drop-v1/tasks.md', '- [x] 1. a (effort: light)\n');
  write(dir, '.keelson/changes/drop-v1/ledger.md', '### Verify: ok\n`true` exit 0\n');
  assert.match(run(dir, ['land'], { env, allowFail: true }).stderr, /BREAKING.*Rollout/);
});

test('guide flag adds the guided line; named checks run with kinds; doctor reports knowledge health', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x"}' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks', '--guide'], { env });
  assert.match(read(dir, 'CLAUDE.md'), /Guided mode is on/);
  assert.match(read(dir, '.keelson/config.yaml'), /^guide: true$/m);
  assert.ok(exists(dir, '.keelson/GLOSSARY.md'));
  write(dir, '.keelson/config.yaml', read(dir, '.keelson/config.yaml').replace(/^check: \[\]$/m, 'check:\n  - name: unit\n    command: "exit 0"\n    kind: test\n  - name: deps\n    command: "exit 0"\n    kind: fitness\n'));
  const tailJson = (out) => JSON.parse(out.slice(out.indexOf('\n{') + 1));
  const r = tailJson(run(dir, ['check', '--quiet', '--json'], { env }).stdout);
  assert.deepEqual(r.results.map((x) => [x.name, x.kind, x.exit]), [['unit', 'test', 0], ['deps', 'fitness', 0]]);
  write(dir, '.keelson/INTENT.md', '# x\n\n## Why this exists\nReal.\n' + 'filler line\n'.repeat(130));
  write(dir, '.keelson/specs/a/spec.md', '# a\n\n## Requirement: Shared\nx\n### Scenario: s\n- WHEN\n- THEN\n');
  write(dir, '.keelson/specs/b/spec.md', '# b\n\n## Requirement: Shared\nThis was changed to y in 2026-01 and moved.\n### Scenario: s\n- WHEN\n- THEN\n');
  const doc = tailJson(run(dir, ['doctor', '--json'], { env, allowFail: true }).stdout);
  const texts = doc.findings.map((f) => f.text);
  assert.ok(texts.some((t) => /budget: INTENT\.md is 1\d\d lines/.test(t)), texts.join('\n'));
  assert.ok(texts.some((t) => /duplicate: requirement "Shared"/.test(t)));
  assert.ok(texts.some((t) => /narrative: .*specs\/b/.test(t)));
  run(dir, ['new', 'layered'], { env });
  write(dir, '.keelson/changes/layered/tasks.md', '## Slice: Database\nDelivers: tables\n- [ ] 1. a (effort: light)\n');
  const v = JSON.parse(run(dir, ['validate', '--json'], { env }).stdout);
  assert.ok(v.warnings.some((w) => /named after a layer/.test(w)));
});
