#!/usr/bin/env node
// CodeBuddy session bridge for Keelson.
// SessionStart/UserPromptSubmit: restore workflow and declared project contracts.
// PreToolUse(Bash|PowerShell): deterministically prepend KEELSON_SESSION_ID to the command.
// Raw CodeBuddy session ids are never written to disk.
import fs from 'node:fs';
import { findProjectRoot } from '../src/lib/paths.js';
import { hookEnvironment, sessionContext } from '../src/lib/hook-context.js';
import { writeSession } from '../src/lib/session.js';

const shellQuote = (v) => `'${String(v).replace(/'/g, "'\\''")}'`;

let input = {};
try {
  const raw = fs.readFileSync(0, 'utf8');
  if (raw.trim()) input = JSON.parse(raw);
} catch {}

const root = findProjectRoot(process.env.CODEBUDDY_PROJECT_DIR || input.cwd || process.cwd());
const sessionId = typeof input.session_id === 'string' ? input.session_id.trim() : '';
if (!sessionId || !root) process.exit(0);

const env = hookEnvironment('codebuddy', input);
const opaque = env.KEELSON_SESSION_ID;
writeSession(root, { source: 'codebuddy' }, env);

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
      modifiedInput: {
        ...input.tool_input,
        command: injected,
      },
    },
  }));
  process.exit(0);
}

if (['SessionStart', 'UserPromptSubmit'].includes(event)) {
  try { process.stdout.write(sessionContext(root, env, event, 'codebuddy') + '\n'); }
  catch (error) { process.stdout.write(`[keelson] Context restoration needs attention: ${error.message}\n`); }
}
