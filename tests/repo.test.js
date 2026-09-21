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

test('generated directory replacement preserves the last good copy across failure and interrupted residue', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-replace-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
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

test('canonical skill separates five conversation intents from automatic completion', () => {
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const skill = fs.readFileSync(path.join(ROOT, lang, 'SKILL.md'), 'utf8');
    for (const intent of ['Explore', 'Change', 'Fix', 'Resume', 'Improve']) assert.match(skill, new RegExp(`\\b${intent}\\b`), `${lang}: ${intent}`);
    assert.match(skill, /Completion is \*\*not\*\* an intent|“完成”\*\*不是一种用户意图\*\*/);
    assert.match(skill, /ready/);
    assert.match(skill, /Artifacts are information containers|工件是信息容器/);
    assert.match(skill, /engineer\.md/);
  }
});

test('READMEs document the trust boundary, local workflow and frontend entry points', () => {
  for (const file of ['README.md', 'README_CN.md']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    for (const term of ['check --trust --record', 'keelson design', 'frontend.md', 'verification.md', 'keelson-banner.png']) assert.ok(text.includes(term), `${file}: ${term}`);
  }
});

test('documentation home and complete user-flow guide exist in both languages', () => {
  for (const file of ['README.md', 'user-flow.md']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', file)), `docs/${file}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'zh', file)), `docs/zh/${file}`);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'user-flow.md'), 'utf8'), /Conversation lifecycle is not work lifecycle/i);
  assert.match(fs.readFileSync(path.join(ROOT, 'docs', 'zh', 'user-flow.md'), 'utf8'), /对话生命周期不等于工作生命周期/);
});

test('resident instructions route to package guidance without a project runtime path', () => {
  for (const lang of ['skills/keelson', 'skills/zh/keelson']) {
    const block = fs.readFileSync(path.join(ROOT, lang, 'templates', 'resident-block.md'), 'utf8');
    assert.ok(block.split('\n').length <= 10, `${lang}/templates/resident-block.md ≤ 10 lines`);
    assert.match(block, /keelson guide/);
    assert.doesNotMatch(block, /\.keelson\/(?:workflow|skill)/);
  }
});

test('repository dogfood uses the configured lightweight discovery shim', () => {
  const config = fs.readFileSync(path.join(ROOT, '.keelson', 'config.yaml'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.keelson', 'manifest.json'), 'utf8'));
  assert.equal(manifest.vendor ?? false, false);
  assert.ok(!fs.existsSync(path.join(ROOT, '.keelson', 'skill')));
  assert.ok(!fs.existsSync(path.join(ROOT, '.keelson', 'workflow.md')));
  const tools = [...config.matchAll(/^  - (\w+)$/gm)].map((match) => match[1]);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'platforms.json'), 'utf8'));
  for (const tool of tools) {
    const platform = registry.platforms[tool];
    assert.ok(platform, `configured platform ${tool}`);
    const shim = path.join(ROOT, platform.skillsDir, 'keelson');
    assert.deepEqual(walk(shim), ['SKILL.md']);
    assert.match(fs.readFileSync(path.join(shim, 'SKILL.md'), 'utf8'), /keelson guide/);
    assert.match(fs.readFileSync(path.join(ROOT, platform.instructions), 'utf8'), /keelson guide/);
  }
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
  assert.match(en, /one question for a simple gap or the whole ready frontier/);
  assert.match(zh, /简单缺口问一个.*复杂不确定性问完整就绪 frontier/);

  const enInterview = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/interview.md'), 'utf8');
  const zhInterview = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/interview.md'), 'utf8');
  const enLenses = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/design-lenses.md'), 'utf8');
  const zhLenses = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/design-lenses.md'), 'utf8');
  const enEngineer = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/engineer.md'), 'utf8');
  const zhEngineer = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/engineer.md'), 'utf8');
  const enVerify = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/verify.md'), 'utf8');
  const zhVerify = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/verify.md'), 'utf8');
  assert.match(enInterview, /not sure/i);
  assert.match(zhInterview, /不确定/);
  for (const id of ['interview.protocol', 'interview.blindspots', 'interview.one-at-a-time', 'interview.presentation', 'interview.implementation', 'interview.order', 'interview.adaptive', 'interview.uncertain', 'interview.stop']) {
    assert.match(enInterview, new RegExp(`id=${id.replace('.', '\\.')}\\b`), id);
    assert.match(zhInterview, new RegExp(`id=${id.replace('.', '\\.')}\\b`), id);
  }
  assert.match(enInterview, /recognition over recall/i);
  assert.match(zhInterview, /优先“识别”而不是“回忆”/);
  assert.match(enInterview, /Implementation direction:/);
  assert.match(zhInterview, /建议实现：/);
  assert.match(enInterview, /no new technology is required/i);
  assert.match(zhInterview, /不需要新增技术时明确说不需要/);
  assert.match(enInterview, /If you cannot name a material consequence.*do not ask/is);
  assert.match(zhInterview, /如果说不清实质后果.*不要问/s);
  for (const term of ['Security', 'Concurrency', 'accessibility', 'AI']) assert.match(enLenses, new RegExp(term, 'i'));
  for (const term of ['安全', '并发', '可访问性', 'AI']) assert.match(zhLenses, new RegExp(term));
  assert.match(enLenses, /id=lenses\.fitness/);
  assert.match(zhLenses, /id=lenses\.fitness/);
  assert.match(enLenses, /simplest design/i);
  assert.match(zhLenses, /最简单设计/);
  for (const id of ['engineer.first-principles', 'engineer.hypothesis', 'engineer.experiment', 'engineer.ablation', 'engineer.architecture', 'engineer.structure', 'engineer.evolution', 'engineer.fitness']) {
    assert.match(enEngineer, new RegExp(`id=${id.replace('.', '\\.')}\\b`), id);
    assert.match(zhEngineer, new RegExp(`id=${id.replace('.', '\\.')}\\b`), id);
  }
  assert.match(enEngineer, /2×2|2x2/i);
  assert.match(zhEngineer, /2×2|2x2/i);
  assert.match(enEngineer, /conceptual integrity/i);
  assert.match(zhEngineer, /conceptual integrity/i);
  assert.match(enEngineer, /Second-system check/i);
  assert.match(zhEngineer, /Second-system 检查/i);
  const enBuild = fs.readFileSync(path.join(ROOT, 'skills/keelson/references/build.md'), 'utf8');
  const zhBuild = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/references/build.md'), 'utf8');
  assert.match(enBuild, /coordination and merge cost/i);
  assert.match(zhBuild, /coordination\/merge cost/i);
  assert.match(enVerify, /id=verify\.counterfactual/);
  assert.match(zhVerify, /id=verify\.counterfactual/);
  assert.match(enVerify, /candidate enabled.*candidate disabled/is);
  assert.match(zhVerify, /candidate enabled.*disabled/s);
  assert.doesNotMatch(enPlan, /at least two real options/i);
  assert.doesNotMatch(zhPlan, /至少两个真实选项/);

  const enChange = fs.readFileSync(path.join(ROOT, 'skills/keelson/templates/change.md'), 'utf8');
  const zhChange = fs.readFileSync(path.join(ROOT, 'skills/zh/keelson/templates/change.md'), 'utf8');
  assert.match(enChange, /Non-goal:/);
  assert.match(zhChange, /非目标：/);
  assert.doesNotMatch(enChange, /^## Alternatives$/m);
  assert.doesNotMatch(zhChange, /^## Alternatives$/m);
});

test('public docs keep outcome-driven readiness and automatic maintenance coherent', () => {
  for (const pathRel of ['docs/concepts.md', 'docs/zh/concepts.md']) {
    const txt = fs.readFileSync(path.join(ROOT, pathRel), 'utf8');
    assert.doesNotMatch(txt, /all existing tasks are complete|tasks 全部完成/);
    assert.match(txt, /tasks\.md.*mutable execution plan|tasks\.md.*可变执行计划/s);
    assert.doesNotMatch(txt, /Nothing is rewritten automatically|没有任何东西被自动重写/);
  }
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
    assert.ok(['native', 'degraded'].includes(reg.platforms[id].sessionFocus), `${id}: sessionFocus capability is explicit`);
  }
  for (const id of ['claude', 'codex', 'pi', 'codebuddy']) assert.equal(reg.platforms[id].sessionFocus, 'native', id);
  for (const id of ['opencode', 'gemini', 'kiro']) assert.equal(reg.platforms[id].sessionFocus, 'degraded', id);
  assert.equal(reg.platforms.opencode.sessionAdapter, undefined);
  assert.equal(reg.platforms.pi.sessionAdapter, 'pi-env');
  assert.equal(reg.platforms.codebuddy.sessionAdapter, 'codebuddy-hooks');
  assert.equal(reg.platforms.agents.support, 'portable');
  assert.equal(reg.platforms.agents.skillsDir, '.agents/skills');
  assert.equal(reg.platforms.agents.sessionFocus, 'degraded');
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
  assert.equal(parseConfig('').confirm.quick, 'proceed');
  assert.equal(parseConfig('').confirm.spec, 'proceed');
  assert.equal(parseConfig('').version, CONFIG_VERSION);
});
