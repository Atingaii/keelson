#!/usr/bin/env node
// Keelson per-prompt state hint. Emits at most one line, and nothing when no change is active.
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const changesDir = path.join(root, '.keelson', 'changes');
if (!fs.existsSync(changesDir)) process.exit(0);
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');

const parts = [];
for (const d of fs.readdirSync(changesDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'archive') continue;
  const dir = path.join(changesDir, d.name);
  const change = read(path.join(dir, 'change.md'));
  if (!change) continue;
  const tasks = read(path.join(dir, 'tasks.md'));
  const total = (tasks.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length;
  const done = (tasks.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
  const ledger = read(path.join(dir, 'ledger.md'));
  const verifies = [...ledger.matchAll(/^###\s+Verify:[\s\S]*?exit\s*(?:code)?\s*[:=]?\s*(\d+)/gim)];
  const lastExit = verifies.length ? Number(verifies.at(-1)[1]) : null;
  const explicit = (change.match(/^status:\s*([\w-]+)/m) || [])[1];
  let work = explicit && ['clarifying', 'in-progress', 'blocked', 'in-review', 'integrated', 'cancelled'].includes(explicit) ? explicit : null;
  if (!work) work = total === 0 ? 'clarifying' : done < total ? 'in-progress' : lastExit === 0 ? 'in-review' : 'in-progress';
  const verify = verifies.length ? (lastExit === 0 ? 'passed' : 'failed') : 'not-run';
  const open = (change.match(/^##\s+Open questions?\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im) || [])[1] || '';
  const openCount = (open.match(/^\s*[-*]\s+(?!…|none)/gim) || []).length;
  parts.push(`${d.name} · ${work} · verify ${verify}${total ? ` · ${done}/${total} tasks` : ''}${openCount ? ` · ${openCount} open` : ''}`);
}
if (parts.length) process.stdout.write(`[keelson] active: ${parts.join(' | ')}\n`);
