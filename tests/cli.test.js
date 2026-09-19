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
  run(dir, ['init', '--tools', 'claude,opencode'], { env });
  for (const f of ['.keelson/README.md', '.keelson/INTENT.md', '.keelson/NOW.md', '.keelson/config.yaml', '.keelson/.managed.json', '.keelson/workflow.md', '.keelson/skill/SKILL.md', '.keelson/skill/references/build.md', '.keelson/rules/index.md', '.keelson/rules/general.md', '.keelson/hooks/session-start.mjs', '.claude/skills/keelson/SKILL.md', '.agents/skills/keelson/SKILL.md', 'AGENTS.md']) assert.ok(exists(dir, f), f);
  assert.ok(!exists(dir, '.claude/skills/keelson/references'), 'host skill directory is a shim only');
  assert.ok(!exists(dir, '.agents/skills/keelson/references'), 'portable skill directory is a shim only');
  assert.ok(!exists(dir, '.keelson/skill/templates'), 'templates are not installed into the canonical runtime skill');
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
  assert.doesNotMatch(read(dir, '.keelson/skill/references/build.md'), /guided/);
  assert.match(read(dir, '.claude/skills/keelson/SKILL.md'), /\.keelson\/skill\/SKILL\.md/);
  assert.match(read(dir, 'CLAUDE.md'), /\.keelson\/workflow\.md/);
});

test('claude-only init installs the portable agents layer and a refreshable human map', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  for (const f of ['CLAUDE.md', 'AGENTS.md', '.claude/skills/keelson/SKILL.md', '.agents/skills/keelson/SKILL.md', '.keelson/README.md', '.keelson/workflow.md', '.keelson/skill/SKILL.md']) assert.ok(exists(dir, f), f);
  const map = read(dir, '.keelson/README.md');
  assert.match(map, /If you have 30 seconds/);
  assert.match(map, /NOW\.md/);
  assert.match(map, /INTENT\.md/);
  write(dir, '.keelson/README.md', '# stale map\n');
  run(dir, ['update', '--no-hooks'], { env });
  assert.doesNotMatch(read(dir, '.keelson/README.md'), /stale map/);
  const rows = JSON.parse(run(dir, ['platforms', '--json'], { env }).stdout);
  assert.equal(rows.find((p) => p.id === 'agents').configured, true);
});

test('changing configured tools removes stale generated adapters but preserves user content', () => {
  const dir = tmpProject({ 'CLAUDE.md': '# Mine\n', 'AGENTS.md': '# Shared\n' });
  run(dir, ['init', '--tools', 'claude,kiro'], { env });
  assert.ok(exists(dir, '.claude/skills/keelson/SKILL.md'));
  assert.ok(exists(dir, '.kiro/skills/keelson/SKILL.md'));
  assert.ok(exists(dir, '.keelson/hooks/session-start.mjs'));

  const dry = run(dir, ['update', '--tools', 'codex', '--dry-run'], { env }).stdout;
  assert.match(dry, /remove\s+\.claude\/skills\/keelson/);
  assert.match(dry, /remove\s+\.kiro\/skills\/keelson/);

  run(dir, ['update', '--tools', 'codex'], { env });
  assert.ok(!exists(dir, '.claude/skills/keelson'));
  assert.ok(!exists(dir, '.kiro/skills/keelson'));
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.equal(read(dir, 'CLAUDE.md'), '# Mine\n');
  assert.match(read(dir, 'AGENTS.md'), /^# Shared/);
  assert.match(read(dir, 'AGENTS.md'), /\.keelson\/workflow\.md/);
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(settings.hooks, undefined);
  const managed = JSON.parse(read(dir, '.keelson/.managed.json'));
  assert.doesNotMatch(JSON.stringify(managed), /claude|kiro/);
  run(dir, ['doctor', '--json'], { env });
});

test('update removes signature-matched legacy Keelson surfaces and preserves neighboring user files', () => {
  const dir = tmpProject({
    '.cursor/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.cursor/rules/keelson.mdc': '# Keelson\nold\n',
    '.cursor/rules/user.mdc': '# My rule\n',
    '.github/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.kilocode/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.kilocode/rules/keelson.md': '# Keelson\nold\n',
    '.kiro/steering/keelson.md': '# Keelson\nold\n',
    '.qoder/rules/keelson.md': '# Keelson\nold\n',
  });
  run(dir, ['init', '--tools', 'agents', '--no-hooks'], { env });
  for (const legacy of [
    '.cursor/skills/keelson',
    '.cursor/rules/keelson.mdc',
    '.github/skills/keelson',
    '.kilocode/skills/keelson',
    '.kilocode/rules/keelson.md',
    '.kiro/steering/keelson.md',
    '.qoder/rules/keelson.md',
  ]) assert.ok(!exists(dir, legacy), legacy);
  assert.ok(exists(dir, '.cursor/rules/user.mdc'));
});

test('retired host selections fail clearly and old config is migrated to portable support', () => {
  const dir = tmpProject({});
  let r = run(dir, ['init', '--cursor'], { env, allowFail: true });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /retired host adapter.*--cursor/);
  assert.match(r.stderr, /--agents/);

  run(dir, ['init', '--tools', 'agents', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', [
    'version: 4',
    'tools:',
    '  - cursor',
    'platforms:',
    '  cursor:',
    '    skillsDir: .cursor/skills',
    'models:',
    '  cursor:',
    '    deep: old-family',
    'hooks: false',
    ''
  ].join('\n'));

  const dry = run(dir, ['update', '--dry-run'], { env }).stdout;
  assert.match(dry, /config tools: drop retired cursor/);
  assert.match(dry, /config platforms: drop retired cursor/);
  assert.match(dry, /config models: drop retired cursor/);

  run(dir, ['update'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /tools:\n\s+- agents/);
  assert.doesNotMatch(cfg, /cursor/);
  run(dir, ['doctor', '--json'], { env });
});

test('every registered platform installs around one canonical runtime and passes doctor', () => {
  const reg = JSON.parse(fs.readFileSync(path.resolve('registry/platforms.json'), 'utf8'));
  for (const [id, platform] of Object.entries(reg.platforms)) {
    const dir = tmpProject({});
    run(dir, ['init', '--tools', id, '--no-hooks'], { env });
    for (const canonical of ['.keelson/workflow.md', '.keelson/skill/SKILL.md', '.keelson/.managed.json']) assert.ok(exists(dir, canonical), `${id}: ${canonical}`);
    const shim = path.join(platform.skillsDir, 'keelson', 'SKILL.md');
    assert.ok(exists(dir, shim), `${id}: ${shim}`);
    assert.match(read(dir, shim), /\.keelson\/skill\/SKILL\.md/, id);
    assert.ok(!exists(dir, path.join(platform.skillsDir, 'keelson', 'references')), `${id}: host skill must stay discovery-only`);
    assert.ok(exists(dir, platform.instructions), `${id}: ${platform.instructions}`);
    assert.match(read(dir, platform.instructions), /\.keelson\/workflow\.md/, id);
    if (platform.rulesFile) {
      assert.ok(exists(dir, platform.rulesFile), `${id}: ${platform.rulesFile}`);
      assert.match(read(dir, platform.rulesFile), /\.keelson\/workflow\.md/, id);
    }
    run(dir, ['doctor', '--json'], { env });
  }
});

test('doctor detects package-owned runtime and shim drift and update repairs it', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/skill/references/build.md', read(dir, '.keelson/skill/references/build.md') + '\ncorrupted\n');
  let doc = run(dir, ['doctor', '--json'], { env, allowFail: true });
  assert.equal(doc.code, 1);
  assert.match(doc.stdout + doc.stderr, /canonical skill drift/);

  run(dir, ['update', '--no-hooks'], { env });
  run(dir, ['doctor', '--json'], { env });

  write(dir, '.agents/skills/keelson/SKILL.md', '# stale shim\n');
  doc = run(dir, ['doctor', '--json'], { env, allowFail: true });
  assert.equal(doc.code, 1);
  assert.match(doc.stdout + doc.stderr, /skill discovery shim drifted/);

  run(dir, ['update', '--no-hooks'], { env });
  run(dir, ['doctor', '--json'], { env });
});

test('no-hooks is persistent and can be explicitly re-enabled', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: false$/m);
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.ok(!exists(dir, '.claude/settings.json'));

  run(dir, ['update'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: false$/m);
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.ok(!exists(dir, '.claude/settings.json'));

  run(dir, ['update', '--hooks'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: true$/m);
  assert.ok(exists(dir, '.keelson/hooks/session-start.mjs'));
  assert.ok(exists(dir, '.claude/settings.json'));
  run(dir, ['doctor', '--json'], { env });
});

test('fresh init auto-detects only first-class hosts and otherwise uses the portable layer', async () => {
  const { chooseDetectedTools } = await import('../src/commands/init.js');
  const none = chooseDetectedTools({});
  assert.deepEqual(none.tools, ['agents']);
  assert.equal(none.portableFallback, true);

  const retiredOrUnknown = chooseDetectedTools({
    cursor: { installed: true },
    snow: { installed: true },
  });
  assert.deepEqual(retiredOrUnknown.tools, ['agents']);
  assert.equal(retiredOrUnknown.portableFallback, true);

  const reliable = chooseDetectedTools({
    codex: { installed: true },
    pi: { installed: true },
    cursor: { installed: true },
  });
  assert.deepEqual(reliable.tools.sort(), ['codex', 'pi']);
  assert.equal(reliable.portableFallback, false);
});

test('guided profile keeps guided blocks; lang zh installs the Chinese skill when present', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--profile', 'guided', '--no-hooks'], { env });
  assert.match(read(dir, '.keelson/skill/references/build.md'), /Test-first when behaviour is specified/);
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
  run(dir, ['init', '--tools', 'claude'], { env });
  const snap = execFileSync('node', [path.join(dir, '.keelson/hooks/session-start.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(snap, /\[keelson\]/);
  assert.match(snap, /Active changes: none/);
  const empty = execFileSync('node', [path.join(dir, '.keelson/hooks/prompt-state.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.equal(empty, '');
  run(dir, ['new', 'thing'], { env });
  const line = execFileSync('node', [path.join(dir, '.keelson/hooks/prompt-state.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(line, /^\[keelson\] active: thing · in-progress · verify not-run · 0\/2 tasks\n$/);
});

test('handoff and session hook tolerate CRLF files', () => {
  const dir = tmpProject({});
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'init'], { cwd: dir });
  run(dir, ['init', '--tools', 'claude'], { env });
  run(dir, ['new', 'crlf-handoff'], { env });
  run(dir, ['handoff', 'crlf-handoff', '--by', 'Ann'], { env });
  const file = '.keelson/changes/crlf-handoff/handoff.md';
  const crlf = read(dir, file)
    .replace(/\n/g, '\r\n')
    .replace(/## Next step\r\n…/, '## Next step\r\nContinue from CRLF.');
  write(dir, file, crlf);
  run(dir, ['handoff', 'crlf-handoff', '--by', 'Ann'], { env });
  const restamped = read(dir, file);
  assert.equal((restamped.match(/^---\r?$/gm) || []).length, 2);
  const snap = execFileSync('node', [path.join(dir, '.keelson/hooks/session-start.mjs')], { env: { ...process.env, CLAUDE_PROJECT_DIR: dir }, encoding: 'utf8' });
  assert.match(snap, /crlf-handoff handoff → next: Continue from CRLF\./);
});

test('ablate removes every surface and restore brings it back byte-for-byte', () => {
  const dir = tmpProject({ 'CLAUDE.md': '# Mine\n' });
  run(dir, ['init', '--tools', 'claude'], { env });
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
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
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
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /^version: 4$/m);
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
  assert.match(dry, /migrate\s+\.keelson\/config\.yaml v1 → v4/);
  assert.match(read(dir, '.keelson/config.yaml'), /^version: 1$/m);
  run(dir, ['update'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /^version: 4$/m);
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
  write(dir, '.keelson/changes/a/tasks.md', '- [x] 1. x (effort: light)\n');
  write(dir, '.keelson/changes/a/change.md', read(dir, '.keelson/changes/a/change.md').replace(/^status:.*$/m, 'status: in-progress').replace(/## Acceptance[\s\S]*?## Open questions/, '## Acceptance\n- [x] ok — check: `true`\n\n## Open questions').replace(/## How\n…/, '## How\nh').replace(/## Alternatives[\s\S]*?## Impact/, '## Alternatives\n- **x (chosen)** — a\n- **y** — strongest: b. Rejected because: c\n\n## Impact').replace(/## Decisions[\s\S]*$/, '## Decisions\n- orders: x over y; y rejected because c\n'));
  write(dir, '.keelson/changes/a/ledger.md', '### Verify: ok\n`true` exit 0\n');
  const landed = run(dir, ['land', 'a', '--dry-run'], { env }).stdout;
  assert.match(landed, /shared contract with active change b/);
  const im = JSON.parse(run(dir, ['impact', 'src/api/orders.js', '--json'], { env }).stdout);
  assert.deepEqual(im.callers, ['src/web.js']);
  assert.equal(im.specs[0].capability, 'orders');
  assert.equal(im.activeChanges.length, 2);
});

test('handoff stamps at/updated/by and the session hook prints its next step', () => {
  const dir = tmpProject({});
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'init'], { cwd: dir });
  run(dir, ['init', '--tools', 'claude'], { env });
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
  run(dir, ['init', '--tools', 'claude'], { env });
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
  assert.ok(!exists(dir, '.keelson/skill'));
  assert.ok(!exists(dir, '.keelson/workflow.md'));
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
  run(dir, ['init', '--tools', 'claude', '--no-hooks', '--guide'], { env });
  assert.match(read(dir, '.keelson/workflow.md'), /Guided mode:/);
  assert.doesNotMatch(read(dir, 'CLAUDE.md'), /Guided mode:/);
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

test('init is the only step: first-class platform flags, standards-first surfaces, first-contact note; no INTENT chore', () => {
  const dir = tmpProject({ 'package.json': '{"name":"shop"}', 'src/a.js': 'export const a = 1;\n' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  const out = run(dir, ['init', '--claude', '--opencode', '--kiro', '--no-hooks'], { env }).stdout;
  assert.match(out, /Open your agent in this directory and start talking/);
  assert.doesNotMatch(out, /Edit \.keelson\/INTENT\.md/);
  for (const f of ['.keelson/workflow.md', '.keelson/skill/SKILL.md', '.keelson/skill/references/verify.md', '.claude/skills/keelson/SKILL.md', '.agents/skills/keelson/SKILL.md', '.kiro/skills/keelson/SKILL.md', 'AGENTS.md', 'CLAUDE.md']) assert.ok(exists(dir, f), f);
  for (const f of ['.cursor/skills/keelson', '.cursor/rules/keelson.mdc', '.kiro/steering/keelson.md']) assert.ok(!exists(dir, f), `standards-first init should not create ${f}`);
  assert.match(read(dir, '.keelson/NOW.md'), /^First contact with /m);
  assert.match(read(dir, '.keelson/NOW.md'), /write one spec per capability/);
  assert.match(read(dir, '.keelson/config.yaml'), /- kiro/);
  const v = JSON.parse(run(dir, ['validate', '--json'], { env }).stdout);
  assert.ok(!v.warnings.some((w) => /placeholder/.test(w)), 'no INTENT placeholder nag before first contact');
  assert.match(read(dir, 'CLAUDE.md'), /\.keelson\/workflow\.md/);
  assert.match(read(dir, '.keelson/workflow.md'), /First contact/);
  for (const shim of ['.claude/skills/keelson/SKILL.md', '.agents/skills/keelson/SKILL.md', '.kiro/skills/keelson/SKILL.md']) {
    assert.match(read(dir, shim), /\.keelson\/skill\/SKILL\.md/);
    assert.ok(!exists(dir, path.join(path.dirname(shim), 'references')), `${shim} should be discovery-only`);
  }
  const list = JSON.parse(run(dir, ['platforms', '--json'], { env }).stdout);
  assert.ok(list.length >= 20);
  assert.ok(list.find((p) => p.id === 'kiro').configured);
  run(dir, ['uninstall'], { env });
  assert.ok(!exists(dir, '.kiro/steering/keelson.md'));
  assert.ok(!exists(dir, '.cursor/skills/keelson'));
});
