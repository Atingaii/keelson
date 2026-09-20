import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { readOr, listDirs } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { loadAllChanges, sharedContracts } from '../lib/changes.js';
import { evaluateLifecycle } from '../lib/lifecycle.js';
import { readSession } from '../lib/session.js';
import { worktreeFingerprint, headSha, lastTag, foldedSince, gitStatusShort, isGitRepo } from '../lib/git.js';
import { heading, dim, warn } from '../lib/out.js';
import { knowledgeHealth } from '../lib/health.js';
import { maintainRuntime } from '../lib/maintenance.js';
import { changeSpecDrift } from '../lib/specs.js';

export function projectStatus(root) {
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const changes = loadAllChanges(p.changes);
  const fp = worktreeFingerprint(root);
  const head = headSha(root);
  const tag = lastTag(root);
  const dirty = gitStatusShort(root) ?? [];
  const session = readSession(root);
  const focus = session.state?.change && changes.some((c) => c.name === session.state.change) ? session.state.change : null;
  const activeNames = new Set(changes.map((c) => c.name));
  const rows = changes.map((c) => {
    const contractDrift = changeSpecDrift(c, p.specs);
    const lifecycle = evaluateLifecycle(c, fp, { activeNames, contractDrift });
    const verification = lifecycle.verification;
    const blockedBy = lifecycle.blockedBy;
    const handoff = c.handoff ? { updated: c.handoff.updated, at: c.handoff.at, headMoved: Boolean(c.handoff.at && head && !head.startsWith(c.handoff.at) && !c.handoff.at.startsWith(head)), next: c.handoff.next } : null;
    return {
      name: c.name,
      tier: c.tier,
      owner: c.owner,
      branch: c.branch,
      work: lifecycle.work,
      verification,
      gates: lifecycle.gates,
      lifecycleWarnings: lifecycle.warnings,
      release: c.release ?? 'unreleased',
      progress: c.progress,
      slices: c.slices,
      acceptance: c.acceptanceProgress,
      open: c.open,
      assumed: c.assumed.length,
      capabilities: c.capabilities,
      depends: c.depends,
      blockedBy,
      handoff,
      rulings: c.ledger.filter((e) => e.kind === 'ruling').length,
      tasks: c.tasks,
    };
  });
  const knowledgeFindings = knowledgeHealth(root, cfg, p).filter((h) => h.kind === 'budget' || h.kind === 'budget-hard');
  const knowledge = {
    critical: knowledgeFindings.filter((h) => h.level === 'error').length,
    overBudget: knowledgeFindings.filter((h) => h.level === 'warn').length,
    findings: knowledgeFindings.map((h) => ({ level: h.level, kind: h.kind, text: h.text })),
  };
  return {
    root,
    head,
    fingerprint: fp,
    dirty: dirty.length,
    specs: listDirs(p.specs),
    specsPath: p.specsRel,
    now: readOr(p.now).trim(),
    focus,
    sessionAvailable: session.available,
    changes: rows,
    knowledge,
    conflicts: sharedContracts(changes),
    release: tag ? { lastTag: tag, landedSince: foldedSince(root, tag) } : null,
  };
}

const GLYPH = { 'not-run': '·', passed: '✓', failed: '✗', stale: '~', partial: '?' };

export async function status({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  maintainRuntime(root);
  const s = projectStatus(root);
  if (flags.json) {
    console.log(JSON.stringify(s, null, 2));
    return 0;
  }
  heading(`Keelson — ${path.basename(root)}`);
  console.log(`${s.specs.length} capabilit${s.specs.length === 1 ? 'y' : 'ies'} in ${s.specsPath} · ${s.changes.length} active change${s.changes.length === 1 ? '' : 's'}${s.focus ? ` · focus ${s.focus}` : ''}${s.head ? ` · HEAD ${s.head}` : ''}${s.dirty ? ` · ${s.dirty} uncommitted` : ''}`);
  console.log('');
  if (!s.changes.length) console.log(dim('No change in flight.'));
  for (const c of s.changes) {
    const who = [c.owner, c.branch && c.branch !== 'main' && c.branch !== 'master' ? c.branch : null].filter(Boolean).join(' @ ');
    console.log(`${c.name}  ${dim(`[${c.tier}]`)}  work: ${c.work}  verify: ${GLYPH[c.verification.state]} ${c.verification.state}  release: ${c.release}${who ? dim(`  (${who})`) : ''}`);
    if (c.verification.state === 'stale') console.log(dim(`   ${c.verification.detail} — re-run \`keelson check --record\` before landing`));
    if (c.blockedBy.length) console.log(dim(`   depends on active: ${c.blockedBy.join(', ')}`));
    if (c.slices.length) for (const sl of c.slices) console.log(`   ${sl.done === sl.total && sl.total ? '✓' : '·'} slice ${sl.name} ${sl.done}/${sl.total}${sl.delivers ? dim(` — ${sl.delivers}`) : ''}`);
    else for (const t of c.tasks) console.log(`   ${t.done ? '✓' : '·'} ${t.id ? t.id + ' ' : ''}${t.title}${t.effort ? dim(` (${t.effort})`) : ''}`);
    if (c.acceptance.total) console.log(dim(`   acceptance ${c.acceptance.done}/${c.acceptance.total}`));
    if (c.open.length) console.log(`   open: ${c.open.map((o) => `${o.text}${o.blocks.length ? ` (blocks ${o.blocks.join(', ')})` : ''}`).join('; ')}`);
    if (c.assumed) console.log(dim(`   ${c.assumed} assumed decision${c.assumed > 1 ? 's' : ''} awaiting the owner`));
    if (c.handoff) console.log(dim(`   handoff ${c.handoff.updated ?? ''}${c.handoff.at ? ` at ${c.handoff.at}` : ''}${c.handoff.headMoved ? ' — HEAD moved since; check the worktree before resuming' : ''}`));
  }
  if (s.conflicts.length) {
    console.log('');
    for (const k of s.conflicts) warn(`shared contract: ${k.a} and ${k.b} both touch ${[...k.capabilities.map((c) => `specs/${c}`), ...k.paths].join(', ')} — align the interface before implementing both`);
  }
  if (s.release) {
    console.log('');
    console.log(dim(`last release ${s.release.lastTag}; landed since: ${s.release.landedSince.length ? s.release.landedSince.join(', ') : 'none'}`));
  }
  console.log('');
  heading('NOW.md');
  console.log(s.now || dim('(empty)'));
  return 0;
}
