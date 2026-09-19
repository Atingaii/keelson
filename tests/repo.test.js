import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { walk } from '../src/lib/fs.js';
import { datedIdPatterns } from '../src/lib/models.js';
import { applyProfile } from '../src/platforms/index.js';

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
    assert.ok(skill.split('\n').length <= 80, `${lang}/SKILL.md ≤ 80 lines`);
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
