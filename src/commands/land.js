import path from 'node:path';
import fs from 'node:fs';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read, write, rmrf, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { loadChange, loadAllChanges, sharedContracts } from '../lib/changes.js';
import { evaluateLifecycle } from '../lib/lifecycle.js';
import { parseSpec, parseDelta, renderSpec, parseFrontmatter } from '../lib/markdown.js';
import { worktreeFingerprint } from '../lib/git.js';
import { ok, warn, info, heading } from '../lib/out.js';
import { clearChangeBindings, readSession } from '../lib/session.js';
import { budgetStatus } from '../lib/health.js';
import { readCapabilitySpec, planCapabilityStorage, writeCapabilityStorage, capabilityStorageOptions, changeSpecDrift } from '../lib/specs.js';

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
export function landingBlockers(c, fingerprint, { confirmAssumptions = false, acceptDrift = false, specsDir, activeNames = [] } = {}) {
  const contractDrift = specsDir ? changeSpecDrift(c, specsDir) : [];
  return evaluateLifecycle(c, fingerprint, {
    activeNames,
    confirmAssumptions,
    contractDrift,
    acceptDrift,
  }).blockers;
}

export async function land({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  let name = positional[0];
  if (!name) {
    const all = loadAllChanges(p.changes);
    const focused = readSession(root).state?.change;
    if (focused && all.some((c) => c.name === focused)) name = focused;
    else if (all.length === 1) name = all[0].name;
    else throw new Error(all.length ? `several active changes (${all.map((c) => c.name).join(', ')}); bind one with \`keelson focus <name>\` or name one` : 'no active change to land');
  }
  const allChanges = loadAllChanges(p.changes);
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const fp = worktreeFingerprint(root);
  const activeNames = new Set(allChanges.map((x) => x.name));
  const blockers = landingBlockers(c, fp, { confirmAssumptions: Boolean(flags.confirmAssumptions), acceptDrift: Boolean(flags.acceptDrift), specsDir: p.specs, activeNames });
  if (blockers.length && !flags.force) throw new Error(`cannot land "${name}":\n  - ${blockers.join('\n  - ')}\nFix them, or pass --force if the user explicitly asked.`);
  if (blockers.length) warn(`landing with --force despite:\n  - ${blockers.join('\n  - ')}`);
  const uncheckedPlan = c.progress.total ? c.progress.total - c.progress.done : 0;
  if (uncheckedPlan > 0) warn(`${uncheckedPlan} task(s) remain unchecked; tasks are planning notes, not landing gates. Reconcile or remove stale plan items if they still matter.`);

  heading(`Landing ${name} (${c.tier})`);
  const dry = Boolean(flags.dryRun);
  for (const k of sharedContracts(allChanges).filter((k) => k.a === name || k.b === name)) {
    const other = k.a === name ? k.b : k.a;
    const o = loadChange(p.changes, other);
    warn(`shared contract with active change ${other}${o?.owner ? ` (${o.owner})` : ''}: ${[...k.capabilities.map((cap) => `${p.specsRel}/${cap}`), ...k.paths].join(', ')} — its delta will drift after this landing and its owner must re-read the merged spec before landing`);
  }
  // Project every durable write before mutating project truth.
  const projected = new Map();
  const deltaReports = [];
  for (const df of c.deltaFiles) {
    const cap = path.dirname(df).replace(/\\/g, '/');
    if (cap === '.' || cap.includes('<')) {
      warn(`skipping delta at specs/${df}: capability directory is a placeholder`);
      continue;
    }
    const mainPath = path.join(p.specs, cap, 'spec.md');
    const baseText = projected.get(cap)?.text ?? readCapabilitySpec(p.specs, cap);
    const { text, report } = mergeDelta(baseText, read(path.join(c.dir, 'specs', df)), cap);
    projected.set(cap, { path: mainPath, text });
    deltaReports.push({ cap, report });
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
    const baseText = projected.get(cap)?.text ?? readCapabilitySpec(p.specs, cap);
    projected.set(cap, { path: mainPath, text: appendDecisions(baseText, cap, lines) });
  }

  for (const [cap, item] of projected) {
    const storage = planCapabilityStorage(cap, item.text, cfg.budgets?.spec, capabilityStorageOptions(p.specs, cap));
    item.storage = storage;
    if (storage.hardOver.length && !flags.force) {
      const detail = storage.hardOver.map((f) => `${f.rel} ${f.lines} lines`).join(', ');
      throw new Error(`cannot land "${name}": auto-sharding still leaves oversized spec shard(s) in ${p.specsRel}/${cap}: ${detail} (hard limit ${storage.hardLimit}). Semantically compact that requirement first; --force is only for an explicit owner override.`);
    }
    if (storage.mode === 'sharded') info(`${p.specsRel}/${cap}: auto-organize → bounded index + ${storage.files.length - 1} shard(s)`);
    if (storage.hardOver.length) warn(`${p.specsRel}/${cap}: owner forced oversized shard(s): ${storage.hardOver.map((f) => f.rel).join(', ')}`);
  }

  let nextNowText = null;
  if (flags.now) {
    const body = String(flags.now).trim().replace(/^#\s*Now\s*\n+/i, '');
    nextNowText = `# Now\n\n${body}\n`;
    const pressure = budgetStatus(nextNowText, cfg.budgets?.NOW);
    if (pressure.state === 'hard' && !flags.force) {
      throw new Error(`cannot land "${name}": projected NOW.md is ${pressure.lines} lines, above hard limit ${pressure.hardLimit} (budget ${pressure.budget}). Rewrite NOW as current state only.`);
    }
  }

  for (const [cap, item] of projected) if (!dry) writeCapabilityStorage(p.specs, cap, item.storage);
  for (const { cap, report } of deltaReports) {
    ok(`${p.specsRel}/${cap}: +${report.added.length} added, ~${report.modified.length} modified, -${report.removed.length} removed${report.missing.length ? ` (${report.missing.join('; ')})` : ''}`);
  }
  for (const [cap, lines] of byCap) {
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
  if (!dry) clearChangeBindings(root, name);
  if (nextNowText !== null) {
    if (!dry) write(p.now, nextNowText);
    ok('NOW.md rewritten');
  } else info('session focus was cleared for the landed change; NOW.md is optional project-level context, not the source of work lifecycle state');
  info('commit the landing together with the last code change; release status is derived from git tags');
  if (dry) warn('dry run: nothing written');
  return 0;
}

export async function cancel({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  let name = positional[0];
  if (!name) {
    const all = loadAllChanges(p.changes);
    const focused = readSession(root).state?.change;
    if (focused && all.some((c) => c.name === focused)) name = focused;
    else if (all.length === 1) name = all[0].name;
    else throw new Error('usage: keelson cancel <name> [--reason "<why>"]');
  }
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const reason = flags.reason ? String(flags.reason) : 'no reason given';
  const cm = path.join(c.dir, 'change.md');
  write(cm, read(cm).replace(/^status:.*$/m, `status: cancelled`).replace(/\n*$/, `\n\n## Cancelled\n${new Date().toISOString().slice(0, 10)}: ${reason}\n`));
  const dest = path.join(p.archive, `${new Date().toISOString().slice(0, 10)}-${name}-cancelled`);
  mkdirp(p.archive);
  fs.renameSync(c.dir, dest);
  clearChangeBindings(root, name);
  ok(`cancelled ${name} → ${path.relative(root, dest)} (nothing merged into specs)`);
  info('if a decision was ruled out for good, record it in the affected spec\'s Decisions so the path is not retried');
  return 0;
}
