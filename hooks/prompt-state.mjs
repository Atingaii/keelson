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
  if (!fs.existsSync(path.join(dir, 'change.md'))) continue;
  const tasks = read(path.join(dir, 'tasks.md'));
  const total = (tasks.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length;
  const done = (tasks.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
  const ledger = read(path.join(dir, 'ledger.md'));
  const verifies = [...ledger.matchAll(/^###\s+Verify:[\s\S]*?exit\s*(?:code)?\s*[:=]?\s*(\d+)/gim)];
  const lastExit = verifies.length ? Number(verifies.at(-1)[1]) : null;
  let phase = 'planning';
  if (total > 0 && done < total) phase = done === 0 ? 'ready' : 'building';
  if (total > 0 && done === total) phase = lastExit === 0 ? 'landing' : 'verifying';
  parts.push(`${d.name} · ${phase}${total ? ` · ${done}/${total} tasks` : ''}`);
}
if (parts.length) process.stdout.write(`[keelson] active: ${parts.join(' | ')}\n`);
