import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { readOr, walk, listDirs, read, exists } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { parseLedger, ROOT_CAUSES } from '../lib/markdown.js';
import { loadAllChanges } from '../lib/changes.js';
import { historicalLedgers } from '../lib/git.js';
import { PLATFORMS } from '../platforms/index.js';
import { heading, info, warn, ok, dim } from '../lib/out.js';

export function collectLedgers(root) {
  const p = projectPaths(root);
  const out = [];
  for (const c of loadAllChanges(p.changes)) out.push({ source: `active:${c.name}`, entries: c.ledger });
  for (const d of listDirs(p.archive)) {
    const f = path.join(p.archive, d, 'ledger.md');
    if (exists(f)) out.push({ source: `archive:${d}`, entries: parseLedger(read(f)) });
  }
  for (const h of historicalLedgers(root)) out.push({ source: `git:${h.commit.slice(0, 7)}`, entries: parseLedger(h.content) });
  return out;
}

export function computeMetrics(ledgers) {
  const entries = ledgers.flatMap((l) => l.entries);
  const rootCauses = Object.fromEntries(ROOT_CAUSES.map((c) => [c, 0]));
  for (const e of entries) if (e.kind === 'root-cause' && e.category in rootCauses) rootCauses[e.category]++;
  const dispatches = entries.filter((e) => e.kind === 'dispatch');
  const escalations = entries.filter((e) => e.kind === 'escalate');
  const byTier = {};
  for (const t of ['light', 'standard', 'deep']) {
    const d = dispatches.filter((x) => x.tier === t);
    const esc = escalations.filter((x) => x.from === t).length;
    const fails = d.filter((x) => x.result === 'fail').length;
    byTier[t] = { dispatches: d.length, failures: fails, escalatedFrom: esc, firstPass: d.length ? Math.round(((d.length - fails) / d.length) * 100) : null };
  }
  const verifies = entries.filter((e) => e.kind === 'verify');
  return {
    ledgers: ledgers.length,
    entries: entries.length,
    rulings: entries.filter((e) => e.kind === 'ruling').length,
    rootCauses,
    rootCauseTotal: Object.values(rootCauses).reduce((a, b) => a + b, 0),
    byTier,
    verifies: { total: verifies.length, failed: verifies.filter((v) => v.exit !== 0).length },
  };
}

/** Parse "<!-- keelson: id=… | without: … | sunset: … -->" annotations in installed skill references. */
export function collectGuidance(root, tools) {
  const out = [];
  for (const t of tools) {
    const dir = path.join(root, PLATFORMS[t]?.skillsDir ?? '', 'keelson', 'references');
    for (const f of walk(dir)) {
      const txt = read(path.join(dir, f));
      for (const m of txt.matchAll(/<!--\s*keelson:\s*id=([\w.-]+)\s*\|\s*without:\s*([^|]*?)\s*\|\s*sunset:\s*(.*?)\s*-->/g)) {
        out.push({ id: m[1], without: m[2].trim(), sunset: m[3].trim(), file: `${PLATFORMS[t].skillsDir}/keelson/references/${f}` });
      }
    }
    break; // one platform's copy is enough; they are identical
  }
  return out;
}

export function suggestions(metrics, guidance) {
  const s = [];
  const rc = metrics.rootCauses;
  if (metrics.rootCauseTotal >= 20 && rc['guessed-fix'] === 0) s.push({ kind: 'prune', id: 'debug.reproduce-first', why: `0 guessed-fix in ${metrics.rootCauseTotal} root-cause entries; the reproduce-first guidance is no longer preventing anything` });
  if (rc['cross-layer'] >= 3) s.push({ kind: 'rule', why: `${rc['cross-layer']} cross-layer root causes; add a contract rule or a spec requirement for the layers involved` });
  if (rc['missing-rule'] >= 3) s.push({ kind: 'rule', why: `${rc['missing-rule']} bugs traced to a missing convention; check that each one produced a rule` });
  if (rc['propagation'] >= 3) s.push({ kind: 'rule', why: `${rc['propagation']} propagation failures; add a "find all call sites" check to the relevant rules file` });
  const light = metrics.byTier.light;
  if (light.dispatches >= 20 && light.firstPass !== null && light.firstPass < 70) s.push({ kind: 'effort', why: `light-tier first-pass rate ${light.firstPass}% over ${light.dispatches} dispatches; tag fewer tasks as light or tighten the light criteria` });
  if (light.dispatches >= 100 && light.firstPass >= 90) s.push({ kind: 'effort', id: 'plan.effort', why: `light-tier first-pass rate ${light.firstPass}% over ${light.dispatches} dispatches; light can take more than it does now` });
  const std = metrics.byTier.standard;
  if (std.dispatches >= 20 && std.escalatedFrom / std.dispatches > 0.3) s.push({ kind: 'effort', why: `standard escalates to deep ${Math.round((std.escalatedFrom / std.dispatches) * 100)}% of the time; route design-adjacent tasks to deep up front` });
  if (metrics.verifies.total >= 10 && metrics.verifies.failed / metrics.verifies.total > 0.4) s.push({ kind: 'verify', why: `${metrics.verifies.failed}/${metrics.verifies.total} verify entries failed; checks may be flaky or tasks are being ticked before verification` });
  for (const g of guidance) {
    const m = g.sunset.match(/(guessed-fix|cross-layer|missing-rule|propagation|test-gap|implicit-assumption)\s*=\s*0\s*across the last\s*(\d+)/i);
    if (m && metrics.rootCauseTotal >= Number(m[2]) && rc[m[1]] === 0 && !s.some((x) => x.id === g.id)) s.push({ kind: 'prune', id: g.id, why: `sunset condition met: ${g.sunset}` });
  }
  return s;
}

export async function retro({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const ledgers = collectLedgers(root);
  const metrics = computeMetrics(ledgers);
  const guidance = collectGuidance(root, cfg.tools ?? []);
  const sug = suggestions(metrics, guidance);
  if (flags.json) {
    console.log(JSON.stringify({ metrics, guidance, suggestions: sug }, null, 2));
    return 0;
  }
  heading('Keelson retro');
  console.log(`${metrics.ledgers} ledgers (active + archive + git history) · ${metrics.entries} entries · ${metrics.rulings} rulings`);
  console.log('');
  heading('Root causes');
  for (const [k, v] of Object.entries(metrics.rootCauses)) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log('');
  heading('Effort tiers');
  for (const [t, m] of Object.entries(metrics.byTier)) console.log(`  ${t.padEnd(9)} dispatches ${m.dispatches}  failures ${m.failures}  escalated ${m.escalatedFrom}  first-pass ${m.firstPass ?? '—'}${m.firstPass !== null ? '%' : ''}`);
  console.log(`  verify entries ${metrics.verifies.total}, failed ${metrics.verifies.failed}`);
  console.log('');
  heading('Guidance with sunset conditions');
  if (!guidance.length) console.log(dim('  none found (is the skill installed for a configured tool?)'));
  for (const g of guidance) console.log(`  ${g.id.padEnd(26)} ${dim(g.sunset)}`);
  console.log('');
  heading('Suggestions');
  if (!sug.length) console.log(dim('  nothing to change yet — keep working; suggestions need data'));
  for (const s of sug) console.log(`  [${s.kind}] ${s.id ? s.id + ': ' : ''}${s.why}`);
  if (metrics.entries === 0) warn('no ledger entries found. Ledgers are written during build/verify; see the skill references.');
  else ok('done');
  return 0;
}
