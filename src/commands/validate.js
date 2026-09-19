import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, readOr, listDirs, walk, read } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { parseRulesIndex } from '../lib/rules.js';
import { parseSpec, parseDelta, hasSection, EFFORT_TIERS } from '../lib/markdown.js';
import { loadAllChanges } from '../lib/changes.js';
import { datedIdPatterns } from '../lib/models.js';
import { ok, fail, warn } from '../lib/out.js';

export function validateProject(root) {
  const p = projectPaths(root);
  const errors = [];
  const warnings = [];
  const cfg = loadConfig(p.config);

  if (!exists(p.intent)) errors.push('missing .keelson/INTENT.md');
  else if (/^One paragraph\./m.test(readOr(p.intent))) warnings.push('INTENT.md still contains template placeholder text');
  if (!exists(p.now)) errors.push('missing .keelson/NOW.md');
  if (!['lean', 'guided'].includes(cfg.profile)) errors.push(`config.profile must be lean|guided (got ${cfg.profile})`);
  if (!['fold', 'keep'].includes(cfg.land)) errors.push(`config.land must be fold|keep (got ${cfg.land})`);

  // rules index → files exist
  const idx = parseRulesIndex(readOr(p.rulesIndex));
  for (const e of idx) if (!exists(path.join(p.rules, e.file))) errors.push(`rules/index.md references missing file: ${e.file}`);
  for (const f of walk(p.rules)) if (f !== 'index.md' && f.endsWith('.md') && !idx.some((e) => e.file === f)) warnings.push(`rules/${f} is not listed in rules/index.md (it will never be routed)`);

  // specs
  for (const cap of listDirs(p.specs)) {
    const f = path.join(p.specs, cap, 'spec.md');
    if (!exists(f)) {
      errors.push(`specs/${cap}/ has no spec.md`);
      continue;
    }
    const s = parseSpec(read(f));
    if (!s.requirements.length) warnings.push(`specs/${cap}/spec.md has no "## Requirement:" sections`);
    for (const r of s.requirements) if (!/###\s+Scenario:/i.test(r.body)) warnings.push(`specs/${cap}: requirement "${r.name}" has no scenario`);
    const names = s.requirements.map((r) => r.name.toLowerCase());
    for (const n of new Set(names.filter((n, i) => names.indexOf(n) !== i))) errors.push(`specs/${cap}: duplicate requirement "${n}"`);
  }

  // changes
  for (const c of loadAllChanges(p.changes)) {
    const tag = `changes/${c.name}`;
    if (!['quick', 'spec'].includes(c.tier)) errors.push(`${tag}: tier must be quick|spec (got ${c.tier})`);
    for (const sec of ['Why', 'What']) if (!hasSection(c.body, sec)) errors.push(`${tag}/change.md: missing "## ${sec}"`);
    if (c.tier === 'spec') {
      for (const sec of ['How', 'Alternatives', 'Impact']) if (!hasSection(c.body, sec)) errors.push(`${tag}/change.md: spec tier requires "## ${sec}"`);
      if (!c.deltaFiles.length) warnings.push(`${tag}: spec tier but no delta specs under specs/ (fine only if behaviour does not change)`);
      const alts = (c.body.match(/^##\s+Alternatives[\s\S]*?(?=^##\s|\Z)/m) || [''])[0];
      const bullets = (alts.match(/^\s*[-*]\s+/gm) || []).length;
      if (bullets < 2) errors.push(`${tag}/change.md: Alternatives needs at least two options`);
    }
    for (const t of c.tasks) {
      if (t.effort && !EFFORT_TIERS.includes(t.effort)) errors.push(`${tag}/tasks.md: bad effort on "${t.title}"`);
      if (!t.effort) warnings.push(`${tag}/tasks.md: "${t.title}" has no (effort: …) tag`);
    }
    if (/\{\{\w+\}\}|^…$/m.test(c.body)) warnings.push(`${tag}/change.md still has template placeholders`);
    for (const e of c.ledger) if (e.kind === 'verify' && (e.exit === null || !e.command)) errors.push(`${tag}/ledger.md: Verify entry "${e.title}" needs a \`command\` and "exit N"`);
    for (const e of c.ledger) if (e.kind === 'root-cause' && !['missing-rule', 'cross-layer', 'propagation', 'test-gap', 'implicit-assumption', 'guessed-fix'].includes(e.category)) errors.push(`${tag}/ledger.md: unknown root cause category "${e.category}"`);
    for (const df of c.deltaFiles) {
      const d = parseDelta(read(path.join(c.dir, 'specs', df)));
      if (!d.added.length && !d.modified.length && !d.removed.length) warnings.push(`${tag}/specs/${df}: no ADDED/MODIFIED/REMOVED requirements`);
    }
  }

  // no dated model IDs anywhere in .keelson (config included)
  const patterns = datedIdPatterns();
  for (const f of walk(p.keelson)) {
    if (!/\.(md|yaml|yml|json)$/.test(f) || f.startsWith('hooks/')) continue;
    const txt = read(path.join(p.keelson, f));
    for (const re of patterns) {
      const m = txt.match(re);
      if (m) errors.push(`.keelson/${f}: dated model ID "${m[0]}" — use effort tiers (light|standard|deep) or floating aliases`);
    }
  }
  return { errors, warnings };
}

export async function validate({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const { errors, warnings } = validateProject(root);
  if (flags.json) {
    console.log(JSON.stringify({ ok: !errors.length, errors, warnings }, null, 2));
    return errors.length ? 1 : 0;
  }
  for (const w of warnings) warn(w);
  for (const e of errors) fail(e);
  if (!errors.length) ok(`valid${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : ''}`);
  return errors.length ? 1 : 0;
}
