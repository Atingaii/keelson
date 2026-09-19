import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, readOr, listDirs, walk, read } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { parseRulesIndex } from '../lib/rules.js';
import { parseSpec, parseDelta, parseFrontmatter, hasSection, EFFORT_TIERS, ROOT_CAUSES, WORK_STATUSES } from '../lib/markdown.js';
import { loadAllChanges } from '../lib/changes.js';
import { datedIdPatterns } from '../lib/models.js';
import { ok, fail, warn } from '../lib/out.js';

export function validateProject(root) {
  const errors = [];
  const warnings = [];
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);

  if (!exists(p.intent)) errors.push('missing .keelson/INTENT.md');
  else if (/^One paragraph\./m.test(readOr(p.intent)) && !/^First contact with /m.test(readOr(p.now))) warnings.push('INTENT.md still contains template placeholder text (the agent drafts it on first contact; if that already happened, ask it to)');
  if (!exists(p.now)) errors.push('missing .keelson/NOW.md');
  if (!['lean', 'guided'].includes(cfg.profile)) errors.push(`config.profile must be lean|guided (got ${cfg.profile})`);
  if (!['fold', 'keep'].includes(cfg.land)) errors.push(`config.land must be fold|keep (got ${cfg.land})`);
  if (!exists(p.specs)) warnings.push(`paths.specs points at ${p.specsRel}, which does not exist`);
  for (const [k, v] of Object.entries(cfg.refs ?? {})) if (v && !/^https?:\/\//.test(v) && !exists(path.join(root, v))) warnings.push(`refs.${k} points at ${v}, which does not exist`);
  const gi = readOr(path.join(root, '.gitignore'), '');
  if (exists(path.join(root, '.git')) && !/^\.keelson\/\.local\/?$/m.test(gi)) warnings.push('.gitignore does not exclude .keelson/.local/ (session state and evidence would be committed)');

  const idx = parseRulesIndex(readOr(p.rulesIndex));
  for (const e of idx) if (!exists(path.join(p.rules, e.file))) errors.push(`rules/index.md references missing file: ${e.file}`);
  for (const f of walk(p.rules)) if (f !== 'index.md' && f.endsWith('.md') && !idx.some((e) => e.file === f)) warnings.push(`rules/${f} is not listed in rules/index.md (it will never be routed)`);

  for (const cap of listDirs(p.specs)) {
    const f = path.join(p.specs, cap, 'spec.md');
    if (!exists(f)) {
      errors.push(`${p.specsRel}/${cap}/ has no spec.md`);
      continue;
    }
    const s = parseSpec(read(f));
    if (!s.requirements.length) warnings.push(`${p.specsRel}/${cap}/spec.md has no "## Requirement:" sections`);
    for (const r of s.requirements) if (!/###\s+Scenario:/i.test(r.body)) warnings.push(`${p.specsRel}/${cap}: requirement "${r.name}" has no scenario`);
    const names = s.requirements.map((r) => r.name.toLowerCase());
    for (const n of new Set(names.filter((n, i) => names.indexOf(n) !== i))) errors.push(`${p.specsRel}/${cap}: duplicate requirement "${n}"`);
  }

  const active = loadAllChanges(p.changes);
  for (const c of active) {
    const tag = `changes/${c.name}`;
    if (!['quick', 'spec'].includes(c.tier)) errors.push(`${tag}: tier must be quick|spec (got ${c.tier})`);
    if (!WORK_STATUSES.includes(c.work)) errors.push(`${tag}: status must be one of ${WORK_STATUSES.join('|')}`);
    for (const sec of ['Why', 'What']) if (!hasSection(c.body, sec)) errors.push(`${tag}/change.md: missing "## ${sec}"`);
    if (c.tier === 'spec') {
      for (const sec of ['How', 'Alternatives', 'Impact']) if (!hasSection(c.body, sec)) errors.push(`${tag}/change.md: spec tier requires "## ${sec}"`);
      if (!c.deltaFiles.length) warnings.push(`${tag}: spec tier but no delta specs under specs/ (fine only if behaviour does not change)`);
      const alts = (c.body.match(/^##\s+Alternatives[\s\S]*?(?=^##\s|\Z)/m) || [''])[0];
      if ((alts.match(/^\s*[-*]\s+/gm) || []).length < 2) errors.push(`${tag}/change.md: Alternatives needs at least two options`);
      if (!hasSection(c.body, 'Acceptance')) warnings.push(`${tag}/change.md: spec tier without "## Acceptance" — landing will refuse until each acceptance item maps to a check`);
    }
    for (const a of c.acceptance) if (!a.kind) warnings.push(`${tag}/change.md: acceptance "${a.text}" does not say how it is checked (— check: \`cmd\` | test: name | manual: how)`);
    for (const o of c.open) if (!o.blocks.length) warnings.push(`${tag}/change.md: open question "${o.text}" does not say what it blocks (— blocks: <slice>)`);
    for (const d of c.depends) if (!active.some((x) => x.name === d)) warnings.push(`${tag}: depends on "${d}", which is not an active change (landed, or a typo)`);
    if (c.breaking && !c.hasRollout) warnings.push(`${tag}/change.md: **BREAKING** without "## Rollout" — landing will refuse`);
    for (const t of c.tasks) {
      if (t.effort && !EFFORT_TIERS.includes(t.effort)) errors.push(`${tag}/tasks.md: bad effort on "${t.title}"`);
      if (!t.effort) warnings.push(`${tag}/tasks.md: "${t.title}" has no (effort: …) tag`);
    }
    for (const sl of c.slices) {
      if (!sl.delivers) warnings.push(`${tag}/tasks.md: slice "${sl.name}" has no "Delivers:" line`);
      if (/^(db|database|schema|backend|back-end|frontend|front-end|ui|api|model|models|storage|infra|infrastructure)( layer| only)?$/i.test(sl.name.trim())) warnings.push(`${tag}/tasks.md: slice "${sl.name}" is named after a layer; a slice should be one user-observable path through all layers (tracer bullet)`);
    }
    if (/\{\{\w+\}\}|^…$/m.test(c.body)) warnings.push(`${tag}/change.md still has template placeholders`);
    for (const e of c.ledger) {
      if (e.kind === 'verify' && (e.exit === null || !e.command)) errors.push(`${tag}/ledger.md: Verify entry "${e.title}" needs a \`command\` and "exit N"`);
      if (e.kind === 'verify' && !e.tree) warnings.push(`${tag}/ledger.md: Verify entry "${e.title}" has no "tree <hash>", so staleness cannot be detected (use \`keelson check --record\`)`);
      if (e.kind === 'dispatch' && e.result === null) warnings.push(`${tag}/ledger.md: Dispatch "${e.title}" has no "Result: pass|fail" line, so retro cannot count it`);
      if (e.kind === 'root-cause' && !ROOT_CAUSES.includes(e.category)) errors.push(`${tag}/ledger.md: unknown root cause category "${e.category}"`);
    }
    for (const df of c.deltaFiles) {
      const raw = read(path.join(c.dir, 'specs', df));
      const d = parseDelta(parseFrontmatter(raw).body);
      if (!d.added.length && !d.modified.length && !d.removed.length) warnings.push(`${tag}/specs/${df}: no ADDED/MODIFIED/REMOVED requirements`);
    }
    if (c.handoff && !c.handoff.at) warnings.push(`${tag}/handoff.md has no "at:" commit; run \`keelson handoff ${c.name}\` to stamp it`);
  }

  const patterns = datedIdPatterns();
  for (const f of walk(p.keelson, { ignore: ['node_modules', '.git', '.local'] })) {
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
