import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read, write, rmrf, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { loadChange, loadAllChanges } from '../lib/changes.js';
import { parseSpec, parseDelta, renderSpec, sections } from '../lib/markdown.js';
import { ok, warn, info, heading } from '../lib/out.js';
import fs from 'node:fs';

export function mergeDelta(mainText, deltaText, capability) {
  const main = mainText ? parseSpec(mainText) : { purpose: '', requirements: [], decisions: [] };
  const d = parseDelta(deltaText);
  const reqs = [...main.requirements];
  const report = { added: [], modified: [], removed: [], missing: [] };
  for (const r of d.removed) {
    const i = reqs.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase());
    if (i === -1) report.missing.push(`REMOVED "${r.name}" not found`);
    else {
      reqs.splice(i, 1);
      report.removed.push(r.name);
    }
  }
  for (const r of d.modified) {
    const i = reqs.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase());
    if (i === -1) {
      report.missing.push(`MODIFIED "${r.name}" not found; added instead`);
      reqs.push(r);
    } else {
      reqs[i] = r;
      report.modified.push(r.name);
    }
  }
  for (const r of d.added) {
    const i = reqs.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase());
    if (i === -1) {
      reqs.push(r);
      report.added.push(r.name);
    } else {
      reqs[i] = r;
      report.modified.push(`${r.name} (ADDED over existing)`);
    }
  }
  const text = renderSpec({ name: capability, purpose: main.purpose, requirements: reqs, decisions: main.decisions });
  return { text, report };
}

export function extractDecisions(changeBody) {
  const sec = sections(changeBody, 2).find((s) => /^Decisions?$/i.test(s.title));
  if (!sec) return [];
  return sec.body
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter((l) => l && !/^…|\{\{/.test(l))
    .map((l) => {
      const m = l.match(/^([a-z0-9][a-z0-9/-]*)\s*:\s*(.+)$/i);
      return m ? { capability: m[1].toLowerCase(), text: m[2].trim() } : { capability: null, text: l };
    });
}

export function appendDecisions(specText, capability, lines) {
  const s = specText ? parseSpec(specText) : { purpose: '', requirements: [], decisions: [] };
  const existing = new Set(s.decisions.map((d) => d.toLowerCase()));
  const fresh = lines.filter((l) => !existing.has(`${capability}: ${l}`.toLowerCase()) && !existing.has(l.toLowerCase()));
  return renderSpec({ name: capability, purpose: s.purpose, requirements: s.requirements, decisions: [...s.decisions, ...fresh.map((l) => `${capability}: ${l}`)] });
}

export async function land({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const cfg = loadConfig(p.config);
  let name = positional[0];
  if (!name) {
    const all = loadAllChanges(p.changes);
    if (all.length === 1) name = all[0].name;
    else throw new Error(all.length ? `several active changes (${all.map((c) => c.name).join(', ')}); name one` : 'no active change to land');
  }
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const blockers = [];
  if (c.progress.total && c.progress.done < c.progress.total) blockers.push(`${c.progress.total - c.progress.done} task(s) unchecked`);
  if (!c.lastVerify) blockers.push('no `### Verify:` entry in ledger.md');
  else if (c.lastVerify.exit !== 0) blockers.push(`last Verify entry has exit ${c.lastVerify.exit}`);
  if (blockers.length && !flags.force) {
    throw new Error(`cannot land "${name}": ${blockers.join('; ')}. Fix them, or pass --force if the user explicitly asked.`);
  }
  if (blockers.length) warn(`landing with --force despite: ${blockers.join('; ')}`);

  heading(`Landing ${name} (${c.tier})`);
  const dry = Boolean(flags.dryRun);
  // 1. merge delta specs
  for (const df of c.deltaFiles) {
    const cap = path.dirname(df).replace(/\\/g, '/');
    if (cap === '.' || cap.includes('<')) {
      warn(`skipping delta at specs/${df}: capability directory is a placeholder`);
      continue;
    }
    const mainPath = path.join(p.specs, cap, 'spec.md');
    const { text, report } = mergeDelta(readOr(mainPath, ''), read(path.join(c.dir, 'specs', df)), cap);
    if (!dry) write(mainPath, text);
    ok(`specs/${cap}: +${report.added.length} added, ~${report.modified.length} modified, -${report.removed.length} removed${report.missing.length ? ` (${report.missing.join('; ')})` : ''}`);
  }
  // 2. fold decisions
  const decisions = extractDecisions(c.body);
  const byCap = new Map();
  for (const d of decisions) {
    if (!d.capability) {
      warn(`decision without capability prefix skipped: "${d.text}"`);
      continue;
    }
    byCap.set(d.capability, [...(byCap.get(d.capability) ?? []), d.text]);
  }
  for (const [cap, lines] of byCap) {
    const mainPath = path.join(p.specs, cap, 'spec.md');
    if (!dry) write(mainPath, appendDecisions(readOr(mainPath, ''), cap, lines));
    ok(`specs/${cap}: ${lines.length} decision line${lines.length > 1 ? 's' : ''} folded`);
  }
  // 3. fold or keep
  const mode = flags.keep ? 'keep' : cfg.land;
  if (mode === 'keep') {
    const dest = path.join(p.archive, `${new Date().toISOString().slice(0, 10)}-${name}`);
    if (!dry) {
      mkdirp(p.archive);
      fs.renameSync(c.dir, dest);
    }
    ok(`archived → .keelson/changes/archive/${path.basename(dest)}`);
  } else {
    if (!dry) rmrf(c.dir);
    ok(`removed .keelson/changes/${name} (ledger stays in git history)`);
  }
  // 4. NOW.md
  if (flags.now) {
    if (!dry) write(p.now, `# Now\n\n${String(flags.now).trim()}\n`);
    ok('NOW.md rewritten');
  } else info('rewrite .keelson/NOW.md now (present tense: active / blocked / next), or pass --now "<text>"');
  info('commit the landing together with the last code change');
  if (dry) warn('dry run: nothing written');
  return 0;
}
