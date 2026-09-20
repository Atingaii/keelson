#!/usr/bin/env node
// Keelson per-prompt state hint.
// Touches session-local runtime state and emits only the current focus when one exists.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const k = path.join(root, '.keelson');
const changesDir = path.join(k, 'changes');
if (!fs.existsSync(k)) process.exit(0);

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n?/g, '\n') : '');
const readJson = (p) => { try { return JSON.parse(read(p)); } catch { return null; } };
const writeJson = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
};
const hash = (s, n) => crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, n);

let input = {};
try {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) input = JSON.parse(raw);
} catch {}
const hostSession = input.session_id || input.sessionId || null;
const envIdentity = hostSession ? hash(`claude:${hostSession}`, 32) : (process.env.KEELSON_SESSION_ID || null);
const sessionKey = envIdentity ? hash(envIdentity, 24) : null;
const sessionPath = sessionKey ? path.join(k, '.runtime', 'sessions', `${sessionKey}.json`) : null;
let session = sessionPath ? readJson(sessionPath) : null;
if (sessionPath) {
  session ||= { schema: 1, change: null, createdAt: new Date().toISOString() };
  session.updatedAt = new Date().toISOString();
  session.source = 'claude-prompt';
  writeJson(sessionPath, session);
}
if (!fs.existsSync(changesDir)) process.exit(0);

const summarize = (name) => {
  const dir = path.join(changesDir, name);
  const change = read(path.join(dir, 'change.md'));
  if (!change) return null;
  const tasks = read(path.join(dir, 'tasks.md'));
  const total = (tasks.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length;
  const done = (tasks.match(/^\s*[-*]\s+\[[xX]\]/gm) || []).length;
  const ledger = read(path.join(dir, 'ledger.md'));
  const verifies = [...ledger.matchAll(/^###\s+Verify:[\s\S]*?exit\s*(?:code)?\s*[:=]?\s*(\d+)/gim)];
  const lastExit = verifies.length ? Number(verifies.at(-1)[1]) : null;
  const explicit = (change.match(/^status:\s*([\w-]+)/m) || [])[1];
  const verify = verifies.length ? (lastExit === 0 ? 'passed' : 'failed') : 'not-run';
  const open = (change.match(/^##\s+Open questions?\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im) || [])[1] || '';
  const openCount = (open.match(/^\s*[-*]\s+(?!…|none)/gim) || []).length;
  return `${name} · ${explicit || (total ? (done < total ? 'in-progress' : 'awaiting verification') : 'in-progress')} · verify ${verify}${total ? ` · ${done}/${total} tasks` : ''}${openCount ? ` · ${openCount} open` : ''}`;
};

if (session?.change) {
  const line = summarize(session.change);
  if (line) process.stdout.write(`[keelson] focus: ${line}\n`);
  process.exit(0);
}

const names = fs.readdirSync(changesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'archive' && fs.existsSync(path.join(changesDir, d.name, 'change.md')))
  .map((d) => d.name);
if (names.length === 1) process.stdout.write(`[keelson] resume candidate: ${summarize(names[0])}; bind only if this prompt continues that work\n`);
