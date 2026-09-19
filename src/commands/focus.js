import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig } from '../lib/config.js';
import { loadAllChanges, loadChange } from '../lib/changes.js';
import { currentBranch } from '../lib/git.js';
import { bindSession, clearSession, readSession } from '../lib/session.js';
import { ok, info, warn } from '../lib/out.js';

function candidatesFor(root, changes) {
  const branch = currentBranch(root);
  const branchMatches = branch ? changes.filter((c) => c.branch === branch) : [];
  if (branchMatches.length === 1) return { preferred: branchMatches[0], reason: `branch ${branch}` };
  if (changes.length === 1) return { preferred: changes[0], reason: 'only active change' };
  return { preferred: null, reason: null };
}

export async function focus({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const changes = loadAllChanges(p.changes);
  const session = readSession(root);

  if (!session.available) {
    const candidate = candidatesFor(root, changes);
    const requested = positional[0] ?? null;
    if (requested && !loadChange(p.changes, requested)) throw new Error(`no active change named "${requested}"`);
    const suggested = requested ?? (flags.auto ? candidate.preferred?.name ?? null : null);
    const payload = { available: false, focus: null, suggested, reason: requested ? 'explicit' : candidate.reason, candidates: changes.map((c) => c.name) };
    if (flags.json) console.log(JSON.stringify(payload, null, 2));
    else {
      warn('session identity is unavailable; Keelson will not persist a shared/global focus because parallel sessions could cross-wire');
      if (suggested) info(`use ${suggested} explicitly for this work (${requested ? 'requested' : candidate.reason}); commands accept a change name/--change where needed`);
      else if (changes.length) info(`active changes: ${changes.map((c) => c.name).join(', ')}`);
    }
    return 0;
  }

  if (flags.clear) {
    clearSession(root);
    if (flags.json) console.log(JSON.stringify({ available: true, focus: null, cleared: true }));
    else ok('session focus cleared; active changes themselves are unchanged');
    return 0;
  }

  let name = positional[0] ?? null;
  if (!name && flags.auto) {
    if (session.state?.change && loadChange(p.changes, session.state.change)) name = session.state.change;
    else {
      const candidate = candidatesFor(root, changes);
      if (candidate.preferred) {
        name = candidate.preferred.name;
        if (!flags.json) info(`resume candidate selected from ${candidate.reason}: ${name}`);
      }
    }
  }

  if (name) {
    const change = loadChange(p.changes, name);
    if (!change) throw new Error(`no active change named "${name}"`);
    const bound = bindSession(root, name, { branch: currentBranch(root), source: flags.auto ? 'auto' : 'focus' });
    const payload = { available: true, focus: name, key: bound?.key ?? session.key };
    if (flags.json) console.log(JSON.stringify(payload, null, 2));
    else ok(`session focus → ${name}`);
    return 0;
  }

  const active = session.state?.change && loadChange(p.changes, session.state.change) ? session.state.change : null;
  const candidate = candidatesFor(root, changes);
  const payload = {
    available: true,
    focus: active,
    updatedAt: session.state?.updatedAt ?? null,
    suggested: active ? null : candidate.preferred?.name ?? null,
    candidates: changes.map((c) => c.name),
  };
  if (flags.json) console.log(JSON.stringify(payload, null, 2));
  else if (active) console.log(active);
  else {
    console.log('no session focus');
    if (candidate.preferred) info(`suggested resume: ${candidate.preferred.name} (${candidate.reason}); run \`keelson focus ${candidate.preferred.name}\` to bind it`);
    else if (changes.length) info(`active changes: ${changes.map((c) => c.name).join(', ')}`);
  }
  return 0;
}
