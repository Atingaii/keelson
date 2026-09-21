import crypto from 'node:crypto';
import path from 'node:path';
import { exists, read, readJson } from './fs.js';
import { projectPaths, resolveWithin } from './paths.js';
import { loadConfig } from './config.js';
import { loadAllChanges } from './changes.js';
import { readSession } from './session.js';
import { decisionFrontier } from './decisions.js';
import { matchRules } from './rules.js';
import { readCapabilitySpec } from './specs.js';

export function activeWorkflow(root, name, env = process.env) {
  const cfg = loadConfig(projectPaths(root).config);
  const paths = projectPaths(root, cfg);
  const changes = loadAllChanges(paths.changes);
  const focused = name ?? readSession(root, env).state?.change;
  // A sole change is a CLI convenience, not permission for an unrelated host
  // session to start writing. Hooks require an explicit session binding.
  const change = changes.find((c) => c.name === (focused ?? (changes.length === 1 ? changes[0].name : null)));
  return { cfg, paths, changes, change };
}

export function planFingerprint(change) {
  return crypto.createHash('sha256').update(JSON.stringify({
    body: change.body.replace(/\[[xX ]\]/g, '[ ]'),
    decisions: change.decisionRecords,
    depends: change.depends, touches: change.touches,
    deltas: change.deltaFiles.map((file) => [file, read(path.join(change.dir, 'specs', file)).replace(/\r\n?/g, '\n')]),
  })).digest('hex');
}

export function planningBlockers(change, changes = []) {
  if (!change) return ['No active change. Create the smallest useful change and run `keelson start <name>`.'];
  const blocked = [];
  if (['blocked', 'cancelled', 'integrated'].includes(change.storedWork)) blocked.push(`Change is ${change.storedWork}.`);
  if (!decisionFrontier({ decisions: change.decisionRecords }, Infinity).complete) blocked.push('Resolve the registered decision tree with `keelson ask frontier --all`.');
  if (change.open.length || change.assumed.length) blocked.push('Resolve the change\'s open questions and unconfirmed assumptions.');
  if (!change.acceptance.length || change.acceptance.some((a) => /^\s*(?:…|<[^>]+>)(?:\s|$)/.test(a.text))) blocked.push('Write concrete acceptance checks in change.md.');
  if (change.depends.some((name) => changes.some((c) => c.name === name))) blocked.push('Finish the prerequisite changes first.');
  return blocked;
}

export function implementationBlockers(change, changes = []) {
  const blockers = planningBlockers(change, changes);
  if (!change) return blockers;
  const receipt = readJson(path.join(change.dir, 'execution.json'), null);
  if (receipt?.schema !== 1 || receipt.plan !== planFingerprint(change)) blockers.push('Run `keelson start` after settling the current plan; its start record is missing or stale.');
  if (change.storedWork !== 'in-progress') blockers.push('Implementation requires the in-progress state set by `keelson start`.');
  return blockers;
}

/** Declarative additions augment mandatory context; they cannot omit a contract. */
export function phaseContext(root, workflow, phase = 'implement', touched = []) {
  if (!['implement', 'check'].includes(phase)) throw new Error('phase must be implement or check');
  const { cfg, paths, change } = workflow;
  const files = new Map();
  const add = (file, required = false) => {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const safe = resolveWithin(root, rel);
    if (exists(safe)) files.set(rel, read(safe).trim());
    else if (required) throw new Error(`declared context file ${rel} is missing; restore it or correct context.json`);
  };
  add(paths.intent);
  if (change) {
    for (const name of ['request.md', 'change.md', 'decisions.json', 'tasks.md']) add(path.join(change.dir, name));
    for (const file of change.deltaFiles) add(path.join(change.dir, 'specs', file), true);
    for (const cap of change.capabilities) {
      const logical = readCapabilitySpec(paths.specs, cap);
      if (logical) files.set(`${paths.specsRel}/${cap}/spec.md (including shards)`, logical);
    }
    const manifestPath = path.join(change.dir, 'context.json');
    if (exists(manifestPath)) {
      const manifest = JSON.parse(read(manifestPath));
      if (manifest.schema !== 1 || !['implement', 'check'].every((key) => Array.isArray(manifest[key]) && manifest[key].every((v) => typeof v === 'string'))) throw new Error('context.json requires schema 1 and implement/check path arrays');
      for (const rel of manifest[phase]) add(resolveWithin(root, rel), true);
    }
  }
  for (const rule of matchRules(paths.rules, [...(change?.touches ?? []), ...touched], { patterns: true })) add(path.join(paths.rules, rule.file), true);
  const instructions = phase === 'check'
    ? 'Review the original request, acceptance, current/delta specs and diff in a fresh context. Find uncovered behavior and risky assumptions. Report findings with evidence; implementation owns repairs, then re-review the affected result. Do not treat the implementer\'s summary as proof.'
    : 'Resolve owner decisions before dependent implementation. Follow the supplied contracts, run relevant checks, and send material changes to an independent reviewer. Continue within existing authorization.';
  return {
    phase, change: change?.name ?? null, instructions,
    checks: cfg.check ?? [],
    files: [...files].map(([file, content]) => ({ file, content })),
  };
}

export function renderPhaseContext(pack) {
  return [`[keelson] ${pack.phase} context${pack.change ? `: ${pack.change}` : ''}`, pack.instructions,
    `Configured checks (review trust before running): ${JSON.stringify(pack.checks)}`,
    ...pack.files.map(({ file, content }) => `\n--- ${file} ---\n${content}`)].join('\n');
}

export function workflowHint(root, env = process.env) {
  const focus = readSession(root, env).state?.change;
  if (!focus) return '[keelson] Read `keelson guide` for this request. Investigate facts first; use one question for a simple gap or the whole ready frontier for connected uncertainty. Before modifying files, create/focus a change and run `keelson start`; keep read-only requests read-only.';
  const workflow = activeWorkflow(root, focus, env);
  if (!workflow.change) return '[keelson] Previous focus is no longer active. Re-read context and select work for the current request.';
  const blocked = implementationBlockers(workflow.change, workflow.changes);
  return `[keelson] ${focus}: ${blocked.length ? 'planning — ' + blocked.join(' ') : 'implement — follow the current context, then independent review → fresh checks → land → reconcile.'} Verification is determined by signed current-tree evidence in \`keelson status\`, never by handwritten ledger text.`;
}
