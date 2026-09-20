import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson } from './fs.js';
import { runtimeDir } from './runtime-path.js';

function restore(journal) {
  for (const entry of journal.entries) {
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
  if (journal.phase !== 'committed') restore(journal);
  fs.rmSync(dir, { recursive: true, force: true });
  return journal.phase !== 'committed';
}

export function landingTransaction(root, targets, mutate) {
  const dir = path.join(runtimeDir(root), 'landing-transaction');
  fs.mkdirSync(dir, { recursive: true });
  const entries = [...new Set(targets)].map((target, i) => ({ target, backup: path.join(dir, String(i)), existed: exists(target) }));
  try {
    for (const e of entries) if (e.existed) fs.cpSync(e.target, e.backup, { recursive: true, preserveTimestamps: true });
    const journal = { phase: 'prepared', entries };
    writeJson(path.join(dir, 'journal.json'), journal);
    try {
      const result = mutate();
      writeJson(path.join(dir, 'journal.json'), { ...journal, phase: 'committed' });
      return result;
    } catch (error) {
      restore(journal);
      writeJson(path.join(dir, 'journal.json'), { ...journal, phase: 'committed' });
      throw error;
    }
  } finally {
    // Preserve backups if restoration itself fails, so the next run can retry.
    const journal = readJson(path.join(dir, 'journal.json'));
    if (!journal || journal.phase === 'committed') fs.rmSync(dir, { recursive: true, force: true });
  }
}
