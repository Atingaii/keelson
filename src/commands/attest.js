import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadAllChanges, loadChange } from '../lib/changes.js';
import { listDirs, readOr } from '../lib/fs.js';
import { verificationStatus } from '../lib/lifecycle.js';
import { worktreeFingerprint } from '../lib/git.js';

const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function archivedChangeName(archiveDir, directory) {
  const landed = readOr(path.join(archiveDir, directory, 'landed.json')).trim();
  if (!landed) return null;
  try {
    const data = JSON.parse(landed);
    return typeof data.change === 'string' && data.change ? data.change : null;
  } catch {
    return null;
  }
}

function legacyArchiveMatches(directory, name) {
  // Before landed.json carried the original name, archives were dated and
  // collision/cancellation suffixes were appended to that date form.
  return new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${escaped(name)}(?:-cancelled)?(?:-\\d+)?$`).test(directory);
}

function resolveArchivedChange(archiveDir, name) {
  const exact = loadChange(archiveDir, name);
  if (exact) return exact;

  const matches = listDirs(archiveDir)
    .filter((directory) => {
      const recorded = archivedChangeName(archiveDir, directory);
      return recorded === name || (!recorded && legacyArchiveMatches(directory, name));
    })
    .map((directory) => ({ directory, change: loadChange(archiveDir, directory) }))
    .filter(({ change }) => change);
  if (matches.length === 1) return matches[0].change;
  if (matches.length > 1) {
    throw new Error(`ambiguous archived change "${name}"; specify an exact archive directory: ${matches.map(({ directory }) => directory).join(', ')}`);
  }
  return null;
}

export async function attest({ positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const changes = loadAllChanges(p.changes);
  const name = positional[0] ?? (changes.length === 1 ? changes[0].name : null);
  if (!name) throw new Error('usage: keelson attest <change>');
  // An active change always wins. Archived changes may be addressed by their
  // exact directory, or by the original change name only when it is unique.
  const c = loadChange(p.changes, name) ?? resolveArchivedChange(p.archive, name);
  if (!c) throw new Error(`no change named ${name}`);
  const verification = verificationStatus(c, worktreeFingerprint(root));
  const envelopes = readOr(path.join(c.dir, 'ledger.jsonl')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  console.log(JSON.stringify({ change: name, verification, trust: 'local-machine; exported key is not an independent trust anchor', publicKey: readOr(path.join(c.dir, 'evidence', 'public-key.pem')), envelopes }, null, 2));
  return verification.state === 'passed' ? 0 : 1;
}
