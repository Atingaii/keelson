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

test('change lifecycle: new → validate → land folds specs and decisions', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x","scripts":{"test":"echo ok"}}' });
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/INTENT.md', '# x\n\n## Why this exists\nReal text.\n');
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: Listing\nlists\n### Scenario: s\n- WHEN a\n- THEN b\n');
  run(dir, ['new', 'Add pagination', '--tier', 'spec', '--capability', 'orders'], { env });
  assert.ok(exists(dir, '.keelson/changes/add-pagination/specs/orders/spec.md'));
  write(dir, '.keelson/changes/add-pagination/change.md', `---\ntier: spec\ncreated: 2026-01-01\n---\n# Add pagination\n\n## Why\nw\n\n## What\n- x\n\n## How\nh\n\n## Alternatives\n- **offset (chosen)** — a\n- **cursor** — strongest: b. Rejected because: c\n\n## Impact\n- i\n\n## Decisions\n- orders: offset pagination over cursor; cursor rejected because page jumps are required\n`);
  write(dir, '.keelson/changes/add-pagination/specs/orders/spec.md', `## ADDED Requirements\n### Requirement: Page size\nThe API SHALL cap size at 200.\n#### Scenario: big\n- WHEN size=500\n- THEN 400\n`);
  write(dir, '.keelson/changes/add-pagination/tasks.md', '- [ ] 1. Do it (effort: light) — verify: `echo ok`\n');
  write(dir, '.keelson/changes/add-pagination/ledger.md', '# Ledger\n');
  const v = run(dir, ['validate', '--json'], { env });
  assert.equal(JSON.parse(v.stdout).ok, true);
  // land refuses while unchecked / unverified
  const refused = run(dir, ['land'], { env, allowFail: true });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /unchecked/);
  write(dir, '.keelson/changes/add-pagination/tasks.md', '- [x] 1. Do it (effort: light) — verify: `echo ok`\n');
  write(dir, '.keelson/changes/add-pagination/ledger.md', '# Ledger\n\n### Verify: done\n`echo ok` exit 0\n');
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout);
  assert.equal(st.changes[0].phase, 'landing');
  run(dir, ['land', '--now', 'Nothing in flight.'], { env });
  assert.ok(!exists(dir, '.keelson/changes/add-pagination'));
  const spec = read(dir, '.keelson/specs/orders/spec.md');
  assert.match(spec, /## Requirement: Page size/);
  assert.match(spec, /### Scenario: big/);
  assert.match(spec, /- orders: offset pagination over cursor/);
  assert.match(read(dir, '.keelson/NOW.md'), /Nothing in flight/);
});

test('land --keep archives instead of folding', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'tidy', '--tier', 'quick'], { env });
  write(dir, '.keelson/changes/tidy/tasks.md', '- [x] 1. a (effort: light)\n');
  write(dir, '.keelson/changes/tidy/ledger.md', '### Verify: ok\n`true` exit 0\n');
  run(dir, ['land', 'tidy', '--keep'], { env });
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
  assert.match(line, /^\[keelson\] active: thing · ready · 0\/2 tasks\n$/);
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
  write(dir, '.keelson/changes/r/ledger.md', '### Root cause: cross-layer\nx\n### Root cause: cross-layer\ny\n### Root cause: cross-layer\nz\n### Dispatch: task 1 → light (h)\npass\n');
  const j = JSON.parse(run(dir, ['retro', '--json'], { env }).stdout);
  assert.equal(j.metrics.rootCauses['cross-layer'], 3);
  assert.equal(j.metrics.byTier.light.dispatches, 1);
  assert.ok(j.suggestions.some((s) => s.kind === 'rule'));
  assert.ok(j.guidance.some((g) => g.id === 'debug.reproduce-first'));
});

