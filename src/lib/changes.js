import path from 'node:path';
import { listDirs, readOr, exists, walk } from './fs.js';
import { parseFrontmatter, parseTasks, parseLedger, hasSection } from './markdown.js';

export const TIERS = ['quick', 'spec'];

export function listChanges(changesDir) {
  return listDirs(changesDir).filter((d) => d !== 'archive' && exists(path.join(changesDir, d, 'change.md')));
}

export function loadChange(changesDir, name) {
  const dir = path.join(changesDir, name);
  if (!exists(path.join(dir, 'change.md'))) return null;
  const change = readOr(path.join(dir, 'change.md'));
  const { data, body } = parseFrontmatter(change);
  const tasks = parseTasks(readOr(path.join(dir, 'tasks.md')));
  const ledger = parseLedger(readOr(path.join(dir, 'ledger.md')));
  const deltaFiles = walk(path.join(dir, 'specs')).filter((f) => f.endsWith('.md'));
  const done = tasks.filter((t) => t.done).length;
  const verified = ledger.filter((e) => e.kind === 'verify');
  const lastVerify = verified.at(-1) ?? null;
  let phase = 'planning';
  if (tasks.length > 0 && done < tasks.length) phase = done === 0 ? 'ready' : 'building';
  if (tasks.length > 0 && done === tasks.length) phase = lastVerify && lastVerify.exit === 0 ? 'landing' : 'verifying';
  return {
    name,
    dir,
    tier: (data.tier ?? 'quick').toLowerCase(),
    created: data.created ?? null,
    status: data.status ?? null,
    body,
    tasks,
    ledger,
    deltaFiles,
    progress: { done, total: tasks.length },
    phase,
    lastVerify,
    hasDecisions: hasSection(body, 'Decisions'),
  };
}

export function loadAllChanges(changesDir) {
  return listChanges(changesDir).map((n) => loadChange(changesDir, n)).filter(Boolean);
}

export const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
