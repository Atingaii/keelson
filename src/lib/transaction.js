import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson } from './fs.js';
import { runtimeDir } from './runtime-path.js';
import { resolveWithin } from './paths.js';

function targetLocation(root, target) {
  const runtime = runtimeDir(root);
  const absolute = path.resolve(target);
  if (absolute === path.join(runtime, 'sessions')) return { scope: 'runtime', target: 'sessions' };
  const relative = path.relative(root, absolute);
  resolveWithin(root, relative);
  if (relative.split(path.sep)[0] === '.git') throw new Error('transaction target must not overwrite Git metadata');
  return { scope: 'project', target: relative };
}

function resolveEntries(root, dir, journal, { requireBackups = true } = {}) {
  if (!journal || !['prepared', 'committed'].includes(journal.phase) || !Array.isArray(journal.entries)
    || (journal.version !== undefined && journal.version !== 2)) throw new Error('invalid landing journal; preserve it for manual recovery');
  // Validate the entire journal before the first removal. In particular, old
  // absolute paths cannot be trusted after a project directory has moved.
  return journal.entries.map((entry, i) => {
    if (!entry || typeof entry.existed !== 'boolean') throw new Error('invalid landing journal entry');
    let location;
    if (journal.version === 2) {
      location = { scope: entry.scope, target: entry.target };
      if (entry.backup !== String(i)) throw new Error('invalid landing backup path');
    } else {
      if (typeof entry.target !== 'string' || !path.isAbsolute(entry.target)
        || entry.backup !== path.join(dir, String(i))) throw new Error('legacy landing journal paths changed; preserve it for manual recovery');
      location = targetLocation(root, entry.target);
    }
    let target;
    if (location.scope === 'runtime' && location.target === 'sessions') {
      target = resolveWithin(runtimeDir(root), 'sessions');
    } else if (location.scope === 'project') {
      target = resolveWithin(root, location.target);
      const checked = targetLocation(root, target);
      if (checked.scope !== 'project') throw new Error('invalid project transaction target');
    } else throw new Error('invalid landing target scope');
    const backup = resolveWithin(dir, String(i));
    if (requireBackups && entry.existed && !exists(backup)) throw new Error(`missing landing backup: ${backup}; preserve the journal for manual recovery`);
    return { target, backup, existed: entry.existed };
  });
}

function restore(root, dir, journal) {
  const entries = resolveEntries(root, dir, journal);
  for (const entry of entries) {
    fs.rmSync(entry.target, { force: true, recursive: true });
    if (entry.existed) {
      fs.mkdirSync(path.dirname(entry.target), { recursive: true });
      fs.cpSync(entry.backup, entry.target, { recursive: true, preserveTimestamps: true });
    }
  }
}

// Caller holds the project landing lock. An interrupted transaction is restored
// before another landing can start. Backups are private, never project content.
export function recoverLanding(root) {
  const dir = path.join(runtimeDir(root), 'landing-transaction');
  const journal = readJson(path.join(dir, 'journal.json'));
  if (!journal) return false;
  resolveEntries(root, dir, journal, { requireBackups: journal.phase !== 'committed' });
  if (journal.phase !== 'committed') restore(root, dir, journal);
  fs.rmSync(dir, { recursive: true, force: true });
  return journal.phase !== 'committed';
}

export function landingTransaction(root, targets, mutate) {
  const dir = path.join(runtimeDir(root), 'landing-transaction');
  if (exists(path.join(dir, 'journal.json'))) throw new Error('landing journal already exists; recover it before starting another transaction');
  fs.mkdirSync(dir, { recursive: true });
  const entries = [...new Set(targets)].map((target, i) => ({ ...targetLocation(root, target), backup: String(i), existed: exists(target) }));
  const journal = { version: 2, phase: 'prepared', entries };
  try {
    for (const e of resolveEntries(root, dir, journal, { requireBackups: false })) if (e.existed) fs.cpSync(e.target, e.backup, { recursive: true, preserveTimestamps: true });
    writeJson(path.join(dir, 'journal.json'), journal);
    try {
      const result = mutate();
      writeJson(path.join(dir, 'journal.json'), { ...journal, phase: 'committed' });
      return result;
    } catch (error) {
      restore(root, dir, journal);
      writeJson(path.join(dir, 'journal.json'), { ...journal, phase: 'committed' });
      throw error;
    }
  } finally {
    // Preserve backups if restoration itself fails, so the next run can retry.
    const journal = readJson(path.join(dir, 'journal.json'));
    if (!journal || journal.phase === 'committed') fs.rmSync(dir, { recursive: true, force: true });
  }
}
