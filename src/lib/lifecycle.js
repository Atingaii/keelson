/**
 * One lifecycle engine for status, context, check, doctor, and land.
 *
 * Work lifecycle is derived from durable outcome gates and fresh evidence.
 * Session focus and tasks.md are advisory runtime/planning state only.
 */

export function verificationStatus(change, fingerprint) {
  const v = change.lastVerify;
  if (!v) return { state: 'not-run', detail: 'no Verify entry' };
  if (v.exit === null) return { state: 'partial', detail: 'Verify entry without exit code' };
  if (v.exit !== 0) return { state: 'failed', detail: `exit ${v.exit}` };
  if (v.tree && fingerprint && v.tree !== fingerprint) {
    return { state: 'stale', detail: `verified at tree ${v.tree}, worktree is ${fingerprint}` };
  }
  if (!v.tree) return { state: 'passed', detail: 'no tree recorded; staleness unknown' };
  return { state: 'passed', detail: `tree ${v.tree}` };
}

const gate = (code, pass, detail) => ({ code, pass, detail });

/**
 * Evaluate the durable work lifecycle without touching the filesystem.
 *
 * activeNames: names of other active changes, used to enforce depends:.
 * confirmAssumptions: land-only owner confirmation; status/check leave this false.
 */
export function evaluateLifecycle(change, fingerprint, {
  activeNames = [],
  confirmAssumptions = false,
  contractDrift = [],
  acceptDrift = false,
} = {}) {
  const active = activeNames instanceof Set ? activeNames : new Set(activeNames);
  const verification = verificationStatus(change, fingerprint);
  const blockedBy = change.depends.filter((name) => active.has(name) && name !== change.name);
  const acceptanceComplete = change.acceptance.length
    ? change.acceptanceProgress.done === change.acceptanceProgress.total
    : change.tier === 'quick';
  const contractComplete = change.tier === 'quick' || change.acceptance.length > 0;
  const rolloutReady = !change.breaking || change.hasRollout;

  const gates = [
    gate(
      'contract',
      contractComplete,
      'spec tier without an "## Acceptance" list'
    ),
    gate(
      'acceptance',
      acceptanceComplete,
      `${Math.max(0, change.acceptance.length - change.acceptanceProgress.done)} acceptance item(s) unchecked`
    ),
    gate(
      'questions',
      change.open.length === 0,
      `${change.open.length} open question(s): ${change.open.map((o) => o.text).join('; ')}`
    ),
    gate(
      'dependencies',
      blockedBy.length === 0,
      `depends on active change(s): ${blockedBy.join(', ')}`
    ),
    gate(
      'drift',
      acceptDrift || contractDrift.length === 0,
      contractDrift.map((d) => d.detail ?? String(d)).join('; ')
    ),
    gate(
      'assumptions',
      change.assumed.length === 0 || confirmAssumptions,
      `${change.assumed.length} assumed decision(s) would be folded as confirmed; pass --confirm-assumptions once the owner agrees`
    ),
    gate(
      'rollout',
      rolloutReady,
      'change is marked **BREAKING** but has no "## Rollout" section (compatibility, migration, rollback)'
    ),
    gate(
      'verification',
      verification.state === 'passed',
      `verification ${verification.state} (${verification.detail})`
    ),
  ];

  if (change.storedWork === 'blocked') {
    gates.unshift(gate('explicit-block', false, 'change status is blocked'));
  }

  // A missing acceptance list on a quick change is intentionally allowed; do not
  // emit a synthetic "0 acceptance unchecked" blocker.
  const blockers = gates
    .filter((g) => !g.pass)
    .filter((g) => !(g.code === 'acceptance' && !change.acceptance.length));

  const explicit = change.storedWork;
  let work;
  if (['integrated', 'cancelled'].includes(explicit)) work = explicit;
  else if (explicit === 'blocked') work = 'blocked';
  else if (blockers.length === 0) work = 'ready';
  else if (explicit === 'clarifying' && change.progress.done === 0 && verification.state === 'not-run') work = 'clarifying';
  else work = 'in-progress';

  const uncheckedTasks = change.progress.total
    ? Math.max(0, change.progress.total - change.progress.done)
    : 0;
  const warnings = uncheckedTasks
    ? [`${uncheckedTasks} task(s) remain unchecked; tasks are planning notes, not lifecycle gates`]
    : [];

  return {
    work,
    verification,
    gates,
    blockers: blockers.map((g) => g.detail),
    blockedBy,
    contractDrift,
    warnings,
  };
}
