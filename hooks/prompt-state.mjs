#!/usr/bin/env node
// Keelson per-prompt state hint.
// Touches session-local runtime state and emits only the current focus when one exists.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeDir } from '../src/lib/runtime-path.js';
import { workflowHint } from '../src/lib/workflow.js';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const k = path.join(root, '.keelson');
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
const sessionPath = sessionKey ? path.join(runtimeDir(root), 'sessions', `${sessionKey}.json`) : null;
let session = sessionPath ? readJson(sessionPath) : null;
if (sessionPath) {
  session ||= { schema: 1, change: null, createdAt: new Date().toISOString() };
  session.updatedAt = new Date().toISOString();
  session.source = 'claude-prompt';
  writeJson(sessionPath, session);
}
try {
  process.stdout.write(workflowHint(root, { ...process.env, ...(envIdentity ? { KEELSON_SESSION_ID: envIdentity } : {}) }) + '\n');
} catch (error) {
  process.stdout.write(`[keelson] Cannot restore workflow: ${error.message}. Run keelson doctor before implementation.\n`);
}
