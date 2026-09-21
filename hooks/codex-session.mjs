#!/usr/bin/env node
import fs from 'node:fs';
import { findProjectRoot } from '../src/lib/paths.js';
import { hookEnvironment, sessionContext } from '../src/lib/hook-context.js';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const root = findProjectRoot(input.cwd || process.cwd());
if (!root) process.exit(0);
const event = input.hook_event_name || 'SessionStart';
try {
  const context = sessionContext(root, hookEnvironment('codex', input), event, 'codex');
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } }) + '\n');
} catch (error) {
  process.stdout.write(`[keelson] Context restoration needs attention: ${error.message}\n`);
}
