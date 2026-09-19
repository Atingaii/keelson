#!/usr/bin/env node
// Keelson session-start hook. Prints a compact project snapshot to stdout; the host adds it as context.
// Self-contained: no dependency on the keelson CLI being installed. Budget: about 1,500 characters.
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const k = path.join(root, '.keelson');
if (!fs.existsSync(k)) process.exit(0);

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s);
const section = (text, re) => {
  const m = text.match(new RegExp(`^##\\s+(?:${re})[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im'));
  return m ? m[1].trim() : '';
};

const now = read(path.join(k, 'NOW.md')).trim();
const roadmapNow = section(read(path.join(k, 'ROADMAP.md')), 'Now');
const changesDir = path.join(k, 'changes');
const active = fs.existsSync(changesDir)
  ? fs.readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'archive' && fs.existsSync(path.join(changesDir, d.name, 'change.md')))
      .map((d) => {
        const dir = path.join(changesDir, d.name);
        const change = read(path.join(dir, 'change.md'));
        const tasks = read(path.join(dir, 'tasks.md'));
        const total = (tasks.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length;
        const done = (tasks.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
        const tier = (change.match(/^tier:\s*(\w+)/m) || [])[1] || 'quick';
        const status = (change.match(/^status:\s*([\w-]+)/m) || [])[1] || null;
        const owner = (change.match(/^owner:\s*(.+)$/m) || [])[1] || null;
        const handoff = read(path.join(dir, 'handoff.md'));
        const next = handoff ? section(handoff, 'Next') : '';
        return { name: d.name, tier, status, owner, done, total, next };
      })
  : [];

const lines = ['[keelson] Project facts live in .keelson/ (INTENT.md, ROADMAP.md, NOW.md, specs, rules/). Run `keelson context --paths <files>` before non-trivial work; `keelson status` for work/verification/release state.'];
if (roadmapNow && !/^…/.test(roadmapNow)) lines.push('', '--- ROADMAP.md · Now ---', clip(roadmapNow, 400));
if (now) lines.push('', '--- NOW.md ---', clip(now, 900));
lines.push('', `Active changes: ${active.length ? active.map((c) => `${c.name} (${c.tier}${c.status ? `, ${c.status}` : ''}, ${c.done}/${c.total} tasks${c.owner ? `, ${c.owner}` : ''})`).join('; ') : 'none'}`);
for (const c of active) if (c.next && !/^…/.test(c.next)) lines.push(`  ${c.name} handoff → next: ${clip(c.next.replace(/\s+/g, ' '), 200)}`);
process.stdout.write(lines.join('\n') + '\n');
