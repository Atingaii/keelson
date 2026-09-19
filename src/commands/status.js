import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { readOr, listDirs } from '../lib/fs.js';
import { loadAllChanges } from '../lib/changes.js';
import { heading, dim } from '../lib/out.js';

export async function status({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const changes = loadAllChanges(p.changes);
  const specs = listDirs(p.specs);
  const now = readOr(p.now).trim();
  if (flags.json) {
    console.log(JSON.stringify({ root, specs, now, changes: changes.map(({ dir, body, ledger, ...c }) => ({ ...c, rulings: ledger.filter((e) => e.kind === 'ruling').length })) }, null, 2));
    return 0;
  }
  heading(`Keelson — ${path.basename(root)}`);
  console.log(`${specs.length} capabilit${specs.length === 1 ? 'y' : 'ies'} with specs · ${changes.length} active change${changes.length === 1 ? '' : 's'}`);
  console.log('');
  if (!changes.length) console.log(dim('No change in flight.'));
  for (const c of changes) {
    console.log(`${c.name}  ${dim(`[${c.tier}]`)}  ${c.phase}  ${c.progress.done}/${c.progress.total} tasks`);
    for (const t of c.tasks) console.log(`   ${t.done ? '✓' : '·'} ${t.id ? t.id + ' ' : ''}${t.title}${t.effort ? dim(` (${t.effort})`) : ''}`);
    const rulings = c.ledger.filter((e) => e.kind === 'ruling');
    if (rulings.length) console.log(dim(`   ${rulings.length} ruling${rulings.length > 1 ? 's' : ''}; last verify: ${c.lastVerify ? `exit ${c.lastVerify.exit}` : 'none'}`));
  }
  console.log('');
  heading('NOW.md');
  console.log(now || dim('(empty)'));
  return 0;
}
