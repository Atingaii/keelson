import path from 'node:path';
import fs from 'node:fs';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read, write, rmrf, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { loadChange, loadAllChanges, verificationStatus, sharedContracts } from '../lib/changes.js';
import { parseSpec, parseDelta, renderSpec, parseFrontmatter } from '../lib/markdown.js';
import { worktreeFingerprint } from '../lib/git.js';
import { specBase } from './new.js';
import { ok, warn, info, heading } from '../lib/out.js';

export function mergeDelta(mainText, deltaText, capability) {
  const main = mainText ? parseSpec(mainText) : { purpose: '', requirements: [], decisions: [] };
  const d = parseDelta(parseFrontmatter(deltaText).body);
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
  return { text: renderSpec({ name: capability, purpose: main.purpose, requirements: reqs, decisions: main.decisions }), report };
}

export function appendDecisions(specText, capability, lines) {
  const s = specText ? parseSpec(specText) : { purpose: '', requirements: [], decisions: [] };
  const existing = new Set(s.decisions.map((d) => d.toLowerCase()));
  const fresh = lines.filter((l) => !existing.has(`${capability}: ${l}`.toLowerCase()) && !existing.has(l.toLowerCase()));
  return renderSpec({ name: capability, purpose: s.purpose, requirements: s.requirements, decisions: [...s.decisions, ...fresh.map((l) => `${capability}: ${l}`)] });
}

/** Everything that stops a landing. Pure; used by `land` and `doctor`. */
export function landingBlockers(c, fingerprint, { confirmAssumptions = false, acceptDrift = false, specsDir } = {}) {
  const b = [];
  if (c.progress.total && c.progress.done < c.progress.total) b.push(`${c.progress.total - c.progress.done} task(s) unchecked`);
  if (c.acceptance.length && c.acceptanceProgress.done < c.acceptance.length) b.push(`${c.acceptance.length - c.acceptanceProgress.done} acceptance item(s) unchecked`);
  if (c.tier === 'spec' && !c.acceptance.length) b.push('spec tier without an "## Acceptance" list');
  if (c.open.length) b.push(`${c.open.length} open question(s): ${c.open.map((o) => o.text).join('; ')}`);
  const v = verificationStatus(c, fingerprint);
  if (v.state !== 'passed') b.push(`verification ${v.state} (${v.detail})`);
  if (c.assumed.length && !confirmAssumptions) b.push(`${c.assumed.length} assumed decision(s) would be folded as confirmed; pass --confirm-assumptions once the owner agrees`);
  if (c.breaking && !c.hasRollout) b.push('change is marked **BREAKING** but has no "## Rollout" section (compatibility, migration, rollback)');
  if (specsDir && !acceptDrift) {
    for (const df of c.deltaFiles) {
      const cap = path.dirname(df).replace(/\\/g, '/');
      const { data } = parseFrontmatter(read(path.join(c.dir, 'specs', df)));
      if (!data.base || cap === '.') continue;
      const main = readOr(path.join(specsDir, cap, 'spec.md'), '');
      const now = main ? specBase(main) : 'new';
      if (now !== data.base) b.push(`specs/${cap} changed since this delta was written (base ${data.base}, now ${now}); re-read it, then pass --accept-drift`);
    }
  }
  return b;
}

export async function land({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  let name = positional[0];
  if (!name) {
    const all = loadAllChanges(p.changes);
    if (all.length === 1) name = all[0].name;
    else throw new Error(all.length ? `several active changes (${all.map((c) => c.name).join(', ')}); name one` : 'no active change to land');
  }
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const fp = worktreeFingerprint(root);
  const blockers = landingBlockers(c, fp, { confirmAssumptions: Boolean(flags.confirmAssumptions), acceptDrift: Boolean(flags.acceptDrift), specsDir: p.specs });
  if (blockers.length && !flags.force) throw new Error(`cannot land "${name}":\n  - ${blockers.join('\n  - ')}\nFix them, or pass --force if the user explicitly asked.`);
  if (blockers.length) warn(`landing with --force despite:\n  - ${blockers.join('\n  - ')}`);

  heading(`Landing ${name} (${c.tier})`);
  const dry = Boolean(flags.dryRun);
  for (const k of sharedContracts(loadAllChanges(p.changes)).filter((k) => k.a === name || k.b === name)) {
    const other = k.a === name ? k.b : k.a;
    const o = loadChange(p.changes, other);
    warn(`shared contract with active change ${other}${o?.owner ? ` (${o.owner})` : ''}: ${[...k.capabilities.map((cap) => `${p.specsRel}/${cap}`), ...k.paths].join(', ')} — its delta will drift after this landing and its owner must re-read the merged spec before landing`);
  }
  for (const df of c.deltaFiles) {
    const cap = path.dirname(df).replace(/\\/g, '/');
    if (cap === '.' || cap.includes('<')) {
      warn(`skipping delta at specs/${df}: capability directory is a placeholder`);
      continue;
    }
    const mainPath = path.join(p.specs, cap, 'spec.md');
    const { text, report } = mergeDelta(readOr(mainPath, ''), read(path.join(c.dir, 'specs', df)), cap);
    if (!dry) write(mainPath, text);
    ok(`${p.specsRel}/${cap}: +${report.added.length} added, ~${report.modified.length} modified, -${report.removed.length} removed${report.missing.length ? ` (${report.missing.join('; ')})` : ''}`);
  }
  const byCap = new Map();
  for (const d of c.decisions) {
    if (!d.capability) {
      warn(`decision without capability prefix skipped: "${d.text}"`);
      continue;
    }
    byCap.set(d.capability, [...(byCap.get(d.capability) ?? []), d.text]);
  }
  for (const [cap, lines] of byCap) {
    const mainPath = path.join(p.specs, cap, 'spec.md');
    if (!dry) write(mainPath, appendDecisions(readOr(mainPath, ''), cap, lines));
    ok(`${p.specsRel}/${cap}: ${lines.length} decision line${lines.length > 1 ? 's' : ''} folded${c.assumed.length ? ` (${c.assumed.length} confirmed by --confirm-assumptions)` : ''}`);
  }
  const mode = flags.keep ? 'keep' : cfg.land;
  if (mode === 'keep') {
    const dest = path.join(p.archive, `${new Date().toISOString().slice(0, 10)}-${name}`);
    if (!dry) {
      mkdirp(p.archive);
      const cm = path.join(c.dir, 'change.md');
      write(cm, read(cm).replace(/^status:.*$/m, 'status: integrated'));
      fs.renameSync(c.dir, dest);
    }
    ok(`archived → .keelson/changes/archive/${path.basename(dest)}`);
  } else {
    if (!dry) rmrf(c.dir);
    ok(`removed .keelson/changes/${name} (ledger and handoff stay in git history)`);
  }
  if (flags.now) {
    // Accept text with or without its own "# Now" heading; never write the heading twice.
    const body = String(flags.now).trim().replace(/^#\s*Now\s*\n+/i, '');
    if (!dry) write(p.now, `# Now\n\n${body}\n`);
    ok('NOW.md rewritten');
  } else info('rewrite .keelson/NOW.md now (present tense: active / blocked / next), or pass --now "<text>"');
  info('commit the landing together with the last code change; release status is derived from git tags');
  if (dry) warn('dry run: nothing written');
  return 0;
}

export async function cancel({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const name = positional[0];
  if (!name) throw new Error('usage: keelson cancel <name> [--reason "<why>"]');
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const reason = flags.reason ? String(flags.reason) : 'no reason given';
  const cm = path.join(c.dir, 'change.md');
  write(cm, read(cm).replace(/^status:.*$/m, `status: cancelled`).replace(/\n*$/, `\n\n## Cancelled\n${new Date().toISOString().slice(0, 10)}: ${reason}\n`));
  const dest = path.join(p.archive, `${new Date().toISOString().slice(0, 10)}-${name}-cancelled`);
  mkdirp(p.archive);
  fs.renameSync(c.dir, dest);
  ok(`cancelled ${name} → ${path.relative(root, dest)} (nothing merged into specs)`);
  info('if a decision was ruled out for good, record it in the affected spec\'s Decisions so the path is not retried');
  return 0;
}
