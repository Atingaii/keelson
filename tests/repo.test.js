import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { walk } from '../src/lib/fs.js';
import { datedIdPatterns } from '../src/lib/models.js';
import { applyProfile, stampVersion } from '../src/platforms/index.js';

const ROOT = path.resolve('.');
const patterns = datedIdPatterns();

test('no dated model IDs in registry, skills, hooks, or docs', () => {
  const offenders = [];
  for (const dir of ['registry', 'skills', 'hooks', 'docs', '.keelson']) {
    for (const f of walk(path.join(ROOT, dir))) {
      const txt = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
      for (const re of patterns) if (re.test(txt)) offenders.push(`${dir}/${f}: ${txt.match(re)[0]}`);
    }
  }
  for (const f of ['README.md', 'README_CN.md']) if (fs.existsSync(path.join(ROOT, f))) for (const re of patterns) if (re.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) offenders.push(f);
  assert.deepEqual(offenders, []);
});

test('English and Chinese skills have the same files and the same guidance ids', () => {
  const en = path.join(ROOT, 'skills', 'keelson');
  const zh = path.join(ROOT, 'skills', 'zh', 'keelson');
  assert.deepEqual(walk(zh), walk(en));
  const ids = (dir) => walk(path.join(dir, 'references')).flatMap((f) => [...fs.readFileSync(path.join(dir, 'references', f), 'utf8').matchAll(/keelson: id=([\w.-]+)/g)].map((m) => `${f}:${m[1]}`));
  assert.deepEqual(ids(zh), ids(en));
});

test('every guidance section carries without and sunset; SKILL.md stays short', () => {
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const skill = fs.readFileSync(path.join(ROOT, lang, 'SKILL.md'), 'utf8');
    assert.ok(skill.split('\n').length <= 60, `${lang}/SKILL.md ≤ 60 lines`);
    assert.match(skill, /^name: keelson$/m);
    for (const f of walk(path.join(ROOT, lang, 'references'))) {
      const txt = fs.readFileSync(path.join(ROOT, lang, 'references', f), 'utf8');
      const notes = [...txt.matchAll(/<!--\s*keelson:([^>]*)-->/g)];
      assert.ok(notes.length >= 2, `${lang}/references/${f} has annotations`);
      for (const n of notes) assert.match(n[1], /id=[\w.-]+\s*\|\s*without:.+\|\s*sunset:.+/s, `${lang}/references/${f}: ${n[1]}`);
      assert.doesNotMatch(applyProfile(txt, 'lean'), /<!-- \/?guided -->/);
      assert.equal((txt.match(/<!-- guided -->/g) || []).length, (txt.match(/<!-- \/guided -->/g) || []).length);
    }
  }
});

test('resident instructions are discovery-only shims into .keelson', () => {
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const block = fs.readFileSync(path.join(ROOT, lang, 'templates', 'resident-block.md'), 'utf8');
    assert.ok(block.split('\n').length <= 10, `${lang}/templates/resident-block.md ≤ 10 lines`);
    assert.match(block, /\.keelson\/workflow\.md/);
    assert.match(block, /\.keelson\/skill\/SKILL\.md/);
    assert.doesNotMatch(block, /keelson context --paths/);
  }
});

test('repository dogfood runtime keeps canonical guidance under .keelson and only shims outside', () => {
  const canonical = walk(path.join(ROOT, 'skills', 'keelson', 'references'));
  const runtime = walk(path.join(ROOT, '.keelson', 'skill', 'references'));
  assert.deepEqual(runtime, canonical);
  for (const shim of ['.claude/skills/keelson', '.agents/skills/keelson']) {
    assert.deepEqual(walk(path.join(ROOT, shim)), ['SKILL.md']);
    assert.match(fs.readFileSync(path.join(ROOT, shim, 'SKILL.md'), 'utf8'), /\.keelson\/skill\/SKILL\.md/);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8'), /\.keelson\/workflow\.md/);
  assert.match(fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'), /\.keelson\/workflow\.md/);
});

test('shaping audits assumptions without turning clarification into ceremony', () => {
  const en = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/shape.md'), 'utf8');
  const zh = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/shape.md'), 'utf8');
  const enDiscover = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/discover.md'), 'utf8');
  const zhDiscover = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/discover.md'), 'utf8');
  const enPlan = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/plan.md'), 'utf8');
  const zhPlan = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/plan.md'), 'utf8');
  assert.match(en, /id=shape\.assumption-audit/);
  assert.match(zh, /id=shape\.assumption-audit/);
  assert.match(enDiscover, /id=discover\.decision-frontier/);
  assert.match(zhDiscover, /id=discover\.decision-frontier/);
  assert.match(enPlan, /id=plan\.assumption-routing/);
  assert.match(zhPlan, /id=plan\.assumption-routing/);
  assert.match(en, /single highest-value question/);
  assert.match(zh, /只问一个最高价值问题/);
  assert.match(fs.readFileSync(path.join(ROOT, 'skills/keelson/templates/change.md'), 'utf8'), /Non-goal:/);
  assert.match(fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/templates/change.md'), 'utf8'), /非目标：/);
});

test('skill frontmatter stamping is CRLF-safe and emits LF', () => {
  const src = '---\r\nname: keelson\r\ndescription: x\r\n---\r\n\r\n# Keelson\r\n';
  const out = stampVersion(src, '9.9.9');
  assert.match(out, /^version: 9\.9\.9$/m);
  assert.doesNotMatch(out, /\r/);
});

test('platform registry retains the broad host compatibility contract', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8'));
  const expected = ['claude', 'cursor', 'opencode', 'codex', 'kiro', 'kilo', 'gemini', 'antigravity', 'devin', 'qoder', 'codebuddy', 'copilot', 'droid', 'pi', 'ohmypi', 'reasonix', 'zcode', 'trae', 'grok', 'kimi', 'snow', 'agents'];
  for (const id of expected) assert.ok(reg.platforms[id], `missing platform: ${id}`);
});

test('platform registry keeps the portable Agent Skills fallback and detects Copilot CLI', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8'));
  assert.equal(reg.platforms.copilot.bin, 'copilot');
  assert.equal(reg.platforms.agents.skillsDir, '.agents/skills');
  assert.match(reg.platforms.agents.examples, /Amp/);
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const map = fs.readFileSync(path.join(ROOT, lang, 'templates', 'README.md'), 'utf8');
    assert.match(map, /NOW\.md/);
    assert.match(map, /INTENT\.md/);
    assert.match(map, /changes/);
  }
});

test('documented hosts reuse the portable surface unless a native skill path adds capability', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8'));

  for (const id of ['cursor', 'copilot', 'kilo']) {
    assert.equal(reg.platforms[id].instructions, 'AGENTS.md', `${id} should reuse AGENTS.md`);
    assert.equal(reg.platforms[id].skillsDir, '.agents/skills', `${id} should reuse .agents/skills`);
    assert.equal(reg.platforms[id].rulesFile, undefined, `${id} should not add a duplicate always-on rule`);
  }

  assert.equal(reg.platforms.kiro.instructions, 'AGENTS.md');
  assert.equal(reg.platforms.kiro.skillsDir, '.kiro/skills');
  assert.equal(reg.platforms.kiro.instructionsFormat, undefined);

  assert.equal(reg.platforms.qoder.instructions, 'AGENTS.md');
  assert.equal(reg.platforms.qoder.skillsDir, '.qoder/skills');
  assert.equal(reg.platforms.qoder.confidence, 'documented');
  assert.equal(reg.platforms.qoder.rulesFile, undefined);
});

test('registry tiers point at aliases that exist in the platform rank', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'models.json'), 'utf8'));
  for (const [id, p] of Object.entries(reg.platforms)) {
    for (const [tier, alias] of Object.entries(p.tiers ?? {})) {
      assert.ok(['light', 'standard', 'deep'].includes(tier), `${id}.${tier}`);
      assert.ok(p.rank.includes(alias), `${id}: ${alias} is in rank`);
    }
  }
});

test('config migration is pure and idempotent', async () => {
  const { parseConfig, CONFIG_VERSION } = await import('../src/lib/config.js');
  const v1 = parseConfig('version: 1\ncheck:\n  - npm test\n');
  assert.equal(v1.version, CONFIG_VERSION);
  assert.deepEqual(v1.check, ['npm test']);
  assert.equal(v1.paths.specs, '.keelson/specs');
  assert.equal(v1.budgets.spec, 250);
  assert.equal(v1.guide, false);
  assert.equal(parseConfig('').version, CONFIG_VERSION);
});
