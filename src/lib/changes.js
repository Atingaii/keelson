import path from 'node:path';
import { listDirs, readOr, exists, walk } from './fs.js';
import { parseFrontmatter, parseTasks, parseSlices, parseLedger, parseAcceptance, parseOpenQuestions, parseDecisions, parseHandoff, hasSection, WORK_STATUSES } from './markdown.js';

export const TIERS = ['quick', 'spec'];

export function listChanges(changesDir) {
  return listDirs(changesDir).filter((d) => d !== 'archive' && exists(path.join(changesDir, d, 'change.md')));
}

const csv = (v) => (v ? String(v).replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean) : []);

export function loadChange(changesDir, name) {
  const dir = path.join(changesDir, name);
  if (!exists(path.join(dir, 'change.md'))) return null;
  const { data, body } = parseFrontmatter(readOr(path.join(dir, 'change.md')));
  const tasksText = readOr(path.join(dir, 'tasks.md'));
  const tasks = parseTasks(tasksText);
  const slices = parseSlices(tasksText);
  const ledger = parseLedger(readOr(path.join(dir, 'ledger.md')));
  const deltaFiles = walk(path.join(dir, 'specs')).filter((f) => f.endsWith('.md'));
  const acceptance = parseAcceptance(body);
  const open = parseOpenQuestions(body);
  const decisions = parseDecisions(body);
  const handoffText = readOr(path.join(dir, 'handoff.md'), '');
  const handoff = handoffText ? parseHandoff(handoffText) : null;
  const done = tasks.filter((t) => t.done).length;
  const lastVerify = ledger.filter((e) => e.kind === 'verify').at(-1) ?? null;
  const acceptanceDone = acceptance.filter((a) => a.done).length;

  // Work status: explicit frontmatter wins; otherwise derived from the artifacts.
  const storedWork = String(data.status ?? '').toLowerCase();
  let work = storedWork;
  if (!WORK_STATUSES.includes(work)) {
    if (open.length && tasks.length === 0) work = 'clarifying';
    else if (tasks.length === 0) work = 'clarifying';
    else if (done < tasks.length) work = 'in-progress';
    else work = lastVerify && lastVerify.exit === 0 ? 'in-review' : 'in-progress';
  }
  const capabilities = new Set(deltaFiles.map((f) => path.dirname(f).replace(/\\/g, '/')).filter((c) => c !== '.'));
  for (const d of decisions) if (d.capability) capabilities.add(d.capability);

  return {
    name,
    dir,
    tier: (data.tier ?? 'quick').toLowerCase(),
    created: data.created ?? null,
    owner: data.owner ?? null,
    branch: data.branch ?? null,
    worktree: data.worktree ?? null,
    depends: csv(data.depends),
    touches: csv(data.touches),
    release: data.release ?? null,
    body,
    tasks,
    slices,
    ledger,
    deltaFiles,
    capabilities: [...capabilities],
    acceptance,
    acceptanceProgress: { done: acceptanceDone, total: acceptance.length },
    open,
    decisions,
    assumed: decisions.filter((d) => d.state === 'assumed'),
    handoff,
    progress: { done, total: tasks.length },
    work,
    storedWork: WORK_STATUSES.includes(storedWork) ? storedWork : null,
    lastVerify,
    hasDecisions: hasSection(body, 'Decisions'),
    hasRollout: hasSection(body, 'Rollout'),
    // Only a bullet that starts with **BREAKING** counts, so the template's own hint does not.
    breaking: /^\s*[-*]\s+\*\*BREAKING\*\*/m.test(body),
  };
}

export function derivedWorkStatus(change, fingerprint) {
  const explicit = change.storedWork;
  if (['blocked', 'integrated', 'cancelled'].includes(explicit)) return explicit;

  const verification = verificationStatus(change, fingerprint);
  const tasksComplete = change.progress.total === 0 || change.progress.done === change.progress.total;
  const acceptanceComplete = change.acceptance.length
    ? change.acceptanceProgress.done === change.acceptanceProgress.total
    : change.tier === 'quick';
  const contractComplete = change.tier === 'quick' || change.acceptance.length > 0;
  const rolloutReady = !change.breaking || change.hasRollout;

  if (
    tasksComplete &&
    acceptanceComplete &&
    contractComplete &&
    change.open.length === 0 &&
    change.assumed.length === 0 &&
    rolloutReady &&
    verification.state === 'passed'
  ) return 'ready';

  if (explicit === 'clarifying' && change.progress.done === 0 && verification.state === 'not-run') return 'clarifying';
  return 'in-progress';
}

/** Verification status for a change given the current worktree fingerprint. */
export function verificationStatus(change, fingerprint) {
  const v = change.lastVerify;
  if (!v) return { state: 'not-run', detail: 'no Verify entry' };
  if (v.exit === null) return { state: 'partial', detail: 'Verify entry without exit code' };
  if (v.exit !== 0) return { state: 'failed', detail: `exit ${v.exit}` };
  if (v.tree && fingerprint && v.tree !== fingerprint) return { state: 'stale', detail: `verified at tree ${v.tree}, worktree is ${fingerprint}` };
  if (!v.tree) return { state: 'passed', detail: 'no tree recorded; staleness unknown' };
  return { state: 'passed', detail: `tree ${v.tree}` };
}

export function loadAllChanges(changesDir) {
  return listChanges(changesDir).map((n) => loadChange(changesDir, n)).filter(Boolean);
}

/** Pairs of active changes that touch the same capability or the same declared paths. */
export function sharedContracts(changes) {
  const out = [];
  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const a = changes[i];
      const b = changes[j];
      const caps = a.capabilities.filter((c) => b.capabilities.includes(c));
      const paths = a.touches.filter((p) => b.touches.some((q) => p === q || p.startsWith(q.replace(/\/?\*\*$/, '')) || q.startsWith(p.replace(/\/?\*\*$/, ''))));
      if (caps.length || paths.length) out.push({ a: a.name, b: b.name, capabilities: caps, paths });
    }
  }
  return out;
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
