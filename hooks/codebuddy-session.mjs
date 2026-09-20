#!/usr/bin/env node
// CodeBuddy session bridge for Keelson.
// SessionStart/UserPromptSubmit: touch local session runtime and inject a tiny focus hint.
// PreToolUse(Bash): deterministically prepend KEELSON_SESSION_ID to the command.
// Raw CodeBuddy session ids are never written to disk.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const hash = (value, n) => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, n);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
const shellQuote = (v) => `'${String(v).replace(/'/g, "'\\''")}'`;

let input = {};
try {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) input = JSON.parse(raw);
} catch {}

const root = input.cwd || process.env.CODEBUDDY_PROJECT_DIR || process.cwd();
const sessionId = typeof input.session_id === 'string' ? input.session_id.trim() : '';
if (!sessionId || !fs.existsSync(path.join(root, '.keelson'))) process.exit(0);

const opaque = hash(`codebuddy:${sessionId}`, 32);
const key = hash(opaque, 24);
const sessionFile = path.join(root, '.keelson', '.runtime', 'sessions', `${key}.json`);
const session = readJson(sessionFile) || { schema: 1, change: null, createdAt: new Date().toISOString() };
session.updatedAt = new Date().toISOString();
session.source = 'codebuddy';
writeJson(sessionFile, session);

const event = input.hook_event_name || '';
if (event === 'PreToolUse' && ['bash', 'powershell'].includes(String(input.tool_name || '').toLowerCase())) {
  const command = input.tool_input?.command;
  if (typeof command !== 'string' || !command.trim()) process.exit(0);
  if (/\bKEELSON_SESSION_ID\s*=/.test(command.slice(0, 180))) process.exit(0);
  const tool = String(input.tool_name || '').toLowerCase();
  const injected = tool === 'powershell'
    ? `$env:KEELSON_SESSION_ID='${opaque}'; ${command}`
    : `export KEELSON_SESSION_ID=${shellQuote(opaque)}; ${command}`;
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Keelson attached the opaque session identity used only for local work-focus routing.',
      modifiedInput: {
        ...input.tool_input,
        command: injected,
      },
    },
  }));
  process.exit(0);
}

const changesDir = path.join(root, '.keelson', 'changes');
const active = fs.existsSync(changesDir)
  ? fs.readdirSync(changesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'archive' && fs.existsSync(path.join(changesDir, d.name, 'change.md')))
      .map((d) => d.name)
  : [];
const focused = session.change && active.includes(session.change) ? session.change : null;
if (focused) process.stdout.write(`[keelson] session focus: ${focused}; use the existing change unless the user requests an independent outcome.\n`);
else if (active.length === 1) process.stdout.write(`[keelson] resume candidate: ${active[0]}; bind only if this prompt continues that work.\n`);
else if (active.length > 1) process.stdout.write(`[keelson] active changes: ${active.join(', ')}; no session focus, so do not guess.\n`);
