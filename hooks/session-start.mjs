#!/usr/bin/env node
// Keelson session-start hook. Prints a compact project snapshot to stdout; the host adds it as context.
// Self-contained: no dependency on the keelson CLI being installed.
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const k = path.join(root, '.keelson');
if (!fs.existsSync(k)) process.exit(0);

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '\n…' : s);

const now = read(path.join(k, 'NOW.md')).trim();
const changesDir = path.join(k, 'changes');
const active = fs.existsSync(changesDir)
  ? fs.readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'archive' && fs.existsSync(path.join(changesDir, d.name, 'change.md')))
      .map((d) => {
        const tasks = read(path.join(changesDir, d.name, 'tasks.md'));
        const total = (tasks.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length;
        const done = (tasks.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
        const tier = (read(path.join(changesDir, d.name, 'change.md')).match(/^tier:\s*(\w+)/m) || [])[1] || 'quick';
        return `${d.name} (${tier}, ${done}/${total} tasks)`;
      })
  : [];
const specs = fs.existsSync(path.join(k, 'specs'))
  ? fs.readdirSync(path.join(k, 'specs'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];

const lines = ['[keelson] Project facts live in .keelson/ (INTENT.md, NOW.md, specs/, rules/). Run `keelson context --paths <files>` before non-trivial work.'];
if (now) lines.push('', '--- NOW.md ---', clip(now, 1200));
lines.push('', `Active changes: ${active.length ? active.join('; ') : 'none'}`);
if (specs.length) lines.push(`Capabilities with specs: ${specs.join(', ')}`);
process.stdout.write(lines.join('\n') + '\n');
