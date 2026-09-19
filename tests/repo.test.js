import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { replaceDirSafe, walk } from '../src/lib/fs.js';
import { datedIdPatterns } from '../src/lib/models.js';
import { applyProfile, renderSkillFiles, stampVersion, workflowContent } from '../src/platforms/index.js';

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

test('generated directory replacement preserves the last good copy across failure and interrupted residue', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-replace-'));
  const dest = path.join(root, 'skill');
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'state.txt'), 'old');

  assert.throws(() => replaceDirSafe(dest, (tmp) => {
    fs.writeFileSync(path.join(tmp, 'state.txt'), 'partial');
    throw new Error('boom');
  }), /boom/);
  assert.equal(fs.readFileSync(path.join(dest, 'state.txt'), 'utf8'), 'old');
  assert.equal(fs.existsSync(dest + '.keelson-tmp'), false);
  assert.equal(fs.existsSync(dest + '.keelson-bak'), false);

  fs.renameSync(dest, dest + '.keelson-bak');
  fs.mkdirSync(dest + '.keelson-tmp', { recursive: true });
  fs.writeFileSync(path.join(dest + '.keelson-tmp', 'state.txt'), 'crash-partial');

  replaceDirSafe(dest, (tmp) => fs.writeFileSync(path.join(tmp, 'state.txt'), 'new'));
  assert.equal(fs.readFileSync(path.join(dest, 'state.txt'), 'utf8'), 'new');
  assert.equal(fs.existsSync(dest + '.keelson-tmp'), false);
  assert.equal(fs.existsSync(dest + '.keelson-bak'), false);
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

test('canonical skill exposes a six-intent user mental model', () => {
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const skill = fs.readFileSync(path.join(ROOT, lang, 'SKILL.md'), 'utf8');
    for (const intent of ['Explore', 'Change', 'Fix', 'Resume', 'Finish', 'Improve']) assert.match(skill, new RegExp(`\\b${intent}\\b`), `${lang}: ${intent}`);
    assert.match(skill, /Artifacts are containers for information|工件是信息容器/);
  }
});

test('documentation home and complete user-flow guide exist in both languages', () => {
  for (const file of ['README.md', 'user-flow.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', file)), `docs/${file}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'zh', file)), `docs/zh/${file}`);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'user-flow.md'), 'utf8'), /init once, talk normally/i);
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'zh', 'user-flow.md'), 'utf8'), /init 一次，正常对话/);
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

test('repository dogfood runtime exactly matches the generated lean canonical runtime and only shims outside', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const rendered = renderSkillFiles('en', 'lean', pkg.version);
  assert.deepEqual(walk(path.join(ROOT, '.keelson', 'skill')), rendered.map((f) => f.rel).sort());
  for (const f of rendered) {
    assert.equal(fs.readFileSync(path.join(ROOT, '.keelson', 'skill', f.rel), 'utf8').replace(/\r\n?/g, '\n'), f.content, `.keelson/skill/${f.rel}`);
  }
  assert.equal(fs.readFileSync(path.join(ROOT, '.keelson', 'workflow.md'), 'utf8').replace(/\r\n?/g, '\n'), workflowContent('en', false));
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

test('platform registry exposes exactly seven first-class hosts plus the portable fallback', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8'));
  const firstClass = ['claude', 'codex', 'opencode', 'pi', 'gemini', 'kiro', 'codebuddy'];
  assert.deepEqual(Object.keys(reg.platforms).sort(), [...firstClass, 'agents'].sort());
  for (const id of firstClass) {
    assert.equal(reg.platforms[id].support, 'first-class', id);
    assert.notEqual(reg.platforms[id].confidence, 'convention', id);
    assert.equal(reg.platforms[id].rulesFile, undefined, `${id}: no duplicate host rule file`);
  }
  assert.equal(reg.platforms.agents.support, 'portable');
  assert.equal(reg.platforms.agents.skillsDir, '.agents/skills');
  assert.match(reg.platforms.agents.examples, /Any host/);
});

test('first-class host discovery paths match their documented integration model', () => {
  const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8')).platforms;

  for (const id of ['codex', 'opencode', 'pi']) {
    assert.equal(p[id].instructions, 'AGENTS.md', id);
    assert.equal(p[id].skillsDir, '.agents/skills', id);
  }

  assert.deepEqual([p.claude.instructions, p.claude.skillsDir, p.claude.hooks], ['CLAUDE.md', '.claude/skills', true]);
  assert.deepEqual([p.gemini.instructions, p.gemini.skillsDir], ['GEMINI.md', '.agents/skills']);
  assert.deepEqual([p.kiro.instructions, p.kiro.skillsDir], ['AGENTS.md', '.kiro/skills']);
  assert.deepEqual([p.codebuddy.instructions, p.codebuddy.skillsDir], ['CODEBUDDY.md', '.codebuddy/skills']);

  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const map = fs.readFileSync(path.join(ROOT, lang, 'templates', 'README.md'), 'utf8');
    assert.match(map, /NOW\.md/);
    assert.match(map, /INTENT\.md/);
    assert.match(map, /changes/);
  }
});

test('model registry is bounded to the seven first-class hosts', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'models.json'), 'utf8'));
  assert.deepEqual(Object.keys(reg.platforms).sort(), ['claude', 'codex', 'opencode', 'pi', 'gemini', 'kiro', 'codebuddy'].sort());
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
  assert.equal(v1.hooks, true);
  assert.deepEqual(parseConfig('').tools, ['agents']);
  assert.equal(parseConfig('').hooks, true);
  assert.equal(parseConfig('').version, CONFIG_VERSION);
});
