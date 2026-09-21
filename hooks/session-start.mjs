#!/usr/bin/env node
// Keelson SessionStart hook.
// Tracks session-local work focus in Keelson's local runtime and prints a compact project snapshot.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeDir } from '../src/lib/runtime-path.js';
import { activeWorkflow, phaseContext, renderPhaseContext, workflowHint } from '../src/lib/workflow.js';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const k = path.join(root, '.keelson');
if (!fs.existsSync(k)) process.exit(0);

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n') : '');
const readJson = (p) => {
  try { return JSON.parse(read(p)); } catch { return null; }
};
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
};
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s);
const section = (text, re) => {
  const m = text.match(new RegExp(`^##\\s+(?:${re})[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im'));
  return m ? m[1].trim() : '';
};
const hash = (s, n) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, n);

let input = {};
try {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) input = JSON.parse(raw);
} catch {}

const hostSession = input.session_id || input.sessionId || null;
// Never persist the host's raw session id. The exported identity is already opaque.
const envIdentity = hostSession ? hash(`claude:${hostSession}`, 32) : (process.env.KEELSON_SESSION_ID || null);
const sessionKey = envIdentity ? hash(envIdentity, 24) : null;
const sessionsDir = path.join(runtimeDir(root), 'sessions');
const sessionPath = sessionKey ? path.join(sessionsDir, `${sessionKey}.json`) : null;

if (envIdentity && process.env.CLAUDE_ENV_FILE) {
  const line = `export KEELSON_SESSION_ID=${envIdentity}`;
  try {
    let last = null;
    if (fs.existsSync(process.env.CLAUDE_ENV_FILE)) {
      for (const raw of fs.readFileSync(process.env.CLAUDE_ENV_FILE, 'utf8').split(/\r?\n/)) {
        const t = raw.trim();
        if (t.startsWith('export KEELSON_SESSION_ID=')) last = t;
      }
    }
    if (last !== line) fs.appendFileSync(process.env.CLAUDE_ENV_FILE, line + '\n');
  } catch {}
}

let session = null;
if (sessionPath) {
  session = readJson(sessionPath) || { schema: 1, change: null, createdAt: new Date().toISOString() };
  session.updatedAt = new Date().toISOString();
  session.source = 'claude-session-start';
  session.injectedContexts = []; // compact/resume must restore previously injected constraints.
  writeJson(sessionPath, session);
}

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
        return { name: d.name, tier, status, owner, done, total };
      })
  : [];

const focused = session?.change && active.some((c) => c.name === session.change) ? session.change : null;
const ordered = focused ? [...active].sort((a, b) => (a.name === focused ? -1 : b.name === focused ? 1 : 0)) : active;
const lines = ['[keelson] Canonical project facts/runtime live under .keelson/. Session focus is local and never marks a change complete.'];
if (focused) lines.push(`Session focus: ${focused}`);
else if (active.length === 1) lines.push(`Resume candidate: ${active[0].name} (bind with \`keelson focus --auto\` only if this request continues that work)`);
else if (active.length > 1) lines.push(`Active changes: ${active.map((c) => c.name).join(', ')} (no session focus)`);
if (roadmapNow && !/^…/.test(roadmapNow)) lines.push('', '--- ROADMAP.md · Now ---', clip(roadmapNow, 350));
if (now) lines.push('', '--- NOW.md ---', clip(now, 650));
if (ordered.length) {
  lines.push('', '--- Active work ---');
  for (const c of ordered.slice(0, 6)) lines.push(`${c.name}${c.name === focused ? ' [focus]' : ''}: ${c.tier}${c.status ? `, ${c.status}` : ''}${c.total ? `, ${c.done}/${c.total} tasks` : ''}${c.owner ? `, ${c.owner}` : ''}`);
}
try {
  const env = { ...process.env, ...(envIdentity ? { KEELSON_SESSION_ID: envIdentity } : {}) };
  lines.push('', workflowHint(root, env));
  if (focused) lines.push(renderPhaseContext(phaseContext(root, activeWorkflow(root, focused, env))));
} catch (error) { lines.push(`[keelson] Context restoration needs attention: ${error.message}`); }
process.stdout.write(lines.join('\n') + '\n');
