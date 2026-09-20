import fs from 'node:fs';
import path from 'node:path';
import { exists, listFiles, rmrf, walk } from './fs.js';

const DAY = 24 * 60 * 60 * 1000;

function safeMtime(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Runtime state is a cache, not durable project truth. Prune it opportunistically
 * from normal Keelson commands so users never need a maintenance command.
 */
export function maintainRuntime(root, {
  now = Date.now(),
  sessionMaxAgeDays = 30,
  evidenceMaxAgeDays = 14,
  maxEvidenceFiles = 200,
} = {}) {
  const runtime = path.join(root, '.keelson', '.runtime');
  const sessions = path.join(runtime, 'sessions');
  const evidence = path.join(runtime, 'evidence');
  const result = { sessionsRemoved: 0, evidenceRemoved: 0 };

  if (exists(sessions)) {
    const cutoff = now - sessionMaxAgeDays * DAY;
    for (const name of listFiles(sessions)) {
      const file = path.join(sessions, name);
      if (safeMtime(file) && safeMtime(file) < cutoff) {
        rmrf(file);
        result.sessionsRemoved += 1;
      }
    }
  }

  if (exists(evidence)) {
    const cutoff = now - evidenceMaxAgeDays * DAY;
    const files = walk(evidence).map((rel) => ({
      rel,
      file: path.join(evidence, rel),
      mtime: safeMtime(path.join(evidence, rel)),
    }));

    for (const item of files) {
      if (item.mtime && item.mtime < cutoff) {
        rmrf(item.file);
        item.removed = true;
        result.evidenceRemoved += 1;
      }
    }

    const remaining = files.filter((x) => !x.removed).sort((a, b) => b.mtime - a.mtime);
    for (const item of remaining.slice(maxEvidenceFiles)) {
      rmrf(item.file);
      result.evidenceRemoved += 1;
    }
  }

  return result;
}
