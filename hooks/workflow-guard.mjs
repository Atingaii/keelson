#!/usr/bin/env node
// Host-specific file-tool gates and phase context injection. Shell/MCP writers
// remain host-policy territory; this is a workflow guard, not a sandbox.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { findProjectRoot } from '../src/lib/paths.js';
import { hookEnvironment } from '../src/lib/hook-context.js';
import { readSession, writeSession } from '../src/lib/session.js';
import { activeWorkflow, implementationBlockers, phaseContext, renderPhaseContext } from '../src/lib/workflow.js';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(2); }
const host = process.argv[2] || 'claude';
const projectDir = host === 'claude' ? process.env.CLAUDE_PROJECT_DIR : host === 'codebuddy' ? process.env.CODEBUDDY_PROJECT_DIR : null;
const root = findProjectRoot(projectDir || input.cwd || process.cwd());
if (!root) process.exit(0);
const env = hookEnvironment(host, input);
const event = input.hook_event_name || 'PreToolUse';
const tool = input.tool_name;
const output = (fields) => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: event, ...fields } }) + '\n');

try {
  const session = readSession(root, env);
  const name = session.state?.change;
  if (host === 'codex' && event === 'SubagentStart' && !name) {
    // session_id is the root, not necessarily the spawning parent. Let the
    // assigned task name its change rather than inheriting an unrelated focus.
    output({ additionalContext: '[keelson] Preserve your assigned scope, including read-only work. If your task includes KEELSON_CHANGE=<name>, run `keelson focus <name>`, then `keelson context --phase check` for review or `--phase implement` for implementation before doing that work. Do not infer a task from the root session or sole repository candidate. Without a marker, keep discovery read-only; create or select a change only when the task explicitly requires implementation. These commands do not grant permission to edit.' });
    process.exit(0);
  }
  const workflow = activeWorkflow(root, name, env);
  // Never infer an unrelated session's change from the sole repository candidate.
  if (!name) workflow.change = null;
  const args = input.tool_input ?? {};
  const file = args.file_path ?? args.notebook_path;
  const patch = host === 'codex' && tool === 'apply_patch';
  const editing = patch || ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'NotebookWrite'].includes(tool);
  const files = patch
    ? [...String(args.command ?? '').matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)\r?$/gm)].map((m) => m[1].trim())
    : typeof file === 'string' ? [file] : [];
  const relative = files.map((f) => path.relative(root, path.resolve(input.cwd || root, f)).replace(/\\/g, '/'));
  const planningOnly = relative.length > 0 && relative.every((f) => f.startsWith('.keelson/') && !f.split('/').includes('..'));
  if (editing && !planningOnly) {
    const blockers = implementationBlockers(workflow.change, workflow.changes);
    if (blockers.length) {
      output({ permissionDecision: 'deny', permissionDecisionReason: blockers.join(' ') + ' The agent should resolve this within existing authorization; do not ask the user to run workflow commands.' });
      process.exit(0);
    }
  }
  if (editing && planningOnly) process.exit(0);
  if (!workflow.change) process.exit(0);
  if (host === 'codex' && ['spawn_agent', 'Agent', 'Task'].includes(tool)) {
    const markers = [...String(args.message ?? args.prompt ?? '').matchAll(/^\s*KEELSON_CHANGE=([^\s]+)[ \t]*$/gm)];
    if (markers.length !== 1 || markers[0][1] !== name) {
      output({ permissionDecision: 'deny', permissionDecisionReason: `Add the single line KEELSON_CHANGE=${name} to this child task so its own CLI session can bind the assigned change. Keep its phase, original instructions and any read-only scope. The agent should correct the task prompt; do not ask the user to run workflow commands.` });
      process.exit(0);
    }
  }
  const descriptor = `${input.agent_type ?? ''} ${args.subagent_type ?? args.agent_type ?? ''} ${args.description ?? ''} ${args.prompt ?? args.message ?? ''}`;
  const reviewing = /KEELSON_PHASE=check|keelson-check|\breview\b|\breviewer\b|复核|审查/i.test(descriptor);
  if (event === 'SubagentStart' && !reviewing && !/KEELSON_PHASE=implement|keelson-implement/i.test(descriptor)) {
    // Generic agent_type carries no parent's prompt or reliable phase. The
    // Agent/Task hook already injected the appropriate pack into that prompt.
    const hint = '[keelson] Follow the phase and contracts in your task prompt. If they are missing, load `keelson context --phase check` for review or `--phase implement` for implementation. Preserve your assigned scope; context is not permission to edit.';
    // A bound Codex child can safely receive its own packs. An unbound child
    // received explicit binding instructions above, never a guessed root task.
    const packs = host === 'codex' ? ['implement', 'check'].map((phase) => renderPhaseContext(phaseContext(root, workflow, phase))) : [];
    output({ additionalContext: [hint, ...packs].join('\n\n') });
    process.exit(0);
  }
  const phase = reviewing ? 'check' : 'implement';
  const pack = phaseContext(root, workflow, phase, relative);
  const context = renderPhaseContext(pack);
  if (['Agent', 'Task'].includes(tool) && typeof args.prompt === 'string') {
    // Preserve every original argument and normal host permission checks.
    if (host === 'codex') output({ additionalContext: context });
    else output({ [host === 'codebuddy' ? 'modifiedInput' : 'updatedInput']: { ...args, prompt: `${args.prompt}\n\n${context}` } });
  } else if (event === 'SubagentStart') {
    output({ additionalContext: context });
  } else if (host === 'codex' && input.agent_id) {
    // Codex does not emit SessionStart when a child compacts or resumes. Do
    // not suppress the next contract pack on the basis of a pre-compact cache.
    output({ additionalContext: context });
  } else if (host !== 'codebuddy') {
    const digest = crypto.createHash('sha256').update(`${input.agent_id ?? 'main'}\n${context}`).digest('hex');
    if (!(session.state?.injectedContexts ?? []).includes(digest)) {
      output({ additionalContext: context });
      writeSession(root, { injectedContexts: [...(session.state?.injectedContexts ?? []).slice(-15), digest] }, env);
    }
  }
} catch (error) {
  if (event === 'PreToolUse') output({ permissionDecision: 'deny', permissionDecisionReason: `Keelson context could not be loaded: ${error.message}. Repair the declared context before retrying.` });
  else output({ additionalContext: `Keelson context could not be loaded: ${error.message}. Investigate before implementation.` });
}
