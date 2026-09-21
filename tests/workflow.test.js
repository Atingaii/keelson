import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { tmpProject, run, read, write, exists, BIN } from './helpers.js';
import { hookEnvironment } from '../src/lib/hook-context.js';
import { readSession } from '../src/lib/session.js';

const env = { KEELSON_SESSION_ID: 'workflow-fixture', CODEX_THREAD_ID: '', PI_SESSION_ID: '' };
const changeFile = '.keelson/changes/sharing/change.md';
function project() {
  const root = tmpProject({
    '.keelson/config.yaml': 'version: 4\ncheck: []\n',
    '.keelson/INTENT.md': '# Purpose\nProtect private team data.\n',
    '.keelson/rules/index.md': '- `src/**` → api.md\n',
    '.keelson/rules/api.md': 'Permission checks must use the team boundary.\n',
    '.keelson/specs/sharing/spec.md': '# Sharing\n\n## Decisions\n- sharing: private by default\n',
    [changeFile]: '---\ntier: spec\nstatus: clarifying\ntouches: [src/**]\n---\n# Sharing\n\n## What\n- Share records with a team.\n\n## Acceptance\n- [ ] Outsiders cannot read records — check: permission regression\n',
    '.keelson/changes/sharing/specs/sharing/spec.md': '## ADDED Requirements\n### Requirement: Team boundary\nOutsiders cannot read records.\n',
    '.keelson/changes/sharing/ledger.md': '### Verify: fake\nexit 0\n',
  });
  run(root, ['focus', 'sharing'], { env });
  return root;
}
function hook(root, tool, toolInput = {}, extra = {}) {
  const result = spawnSync('node', [path.resolve('hooks/workflow-guard.mjs')], {
    cwd: root, env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8',
    input: JSON.stringify({ tool_name: tool, tool_input: toolInput, hook_event_name: 'PreToolUse', ...extra }),
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : {};
}

test('file-tool gate blocks planning, allows authorized start, and closes on reopened decisions', () => {
  const root = project();
  assert.equal(hook(root, 'Write', { file_path: 'src/api.js' }).permissionDecision, 'deny');
  assert.equal(hook(root, 'Write', { file_path: changeFile }).permissionDecision, undefined);
  run(root, ['ask', 'add', 'audience', '--question', 'Which team?', '--json'], { env });
  assert.notEqual(run(root, ['start'], { env, allowFail: true }).code, 0);
  run(root, ['ask', 'settle', 'audience', '--answer', 'Current team only', '--basis', 'Owner response'], { env });
  run(root, ['start'], { env });
  const allowed = hook(root, 'Write', { file_path: 'src/api.js' });
  assert.equal(allowed.permissionDecision, undefined); // Never auto-approve host permissions.
  assert.match(allowed.additionalContext, /private by default/);
  assert.match(allowed.additionalContext, /Permission checks must use/);
  assert.equal(hook(root, 'Write', { file_path: 'src/api.js' }).additionalContext, undefined);
  run(root, ['ask', 'reopen', 'audience', '--reason', 'New sharing requirement'], { env });
  assert.equal(hook(root, 'Edit', { file_path: 'src/api.js' }).permissionDecision, 'deny');
});

test('review context includes declared dependencies and contracts without granting tools', () => {
  const root = project();
  write(root, 'docs/review.md', 'Check cross-team denial and empty-state UX.');
  write(root, '.keelson/changes/sharing/context.json', JSON.stringify({ schema: 1, implement: [], check: ['docs/review.md'] }));
  const args = { prompt: 'KEELSON_PHASE=check\nReview the requested sharing behavior.', subagent_type: 'general-purpose', description: 'Independent review', model: 'inherit' };
  const result = hook(root, 'Agent', args);
  assert.equal(result.permissionDecision, undefined);
  assert.equal(result.updatedInput.model, args.model);
  assert.match(result.updatedInput.prompt, /empty-state UX/);
  assert.match(result.updatedInput.prompt, /fresh context/);
  assert.match(result.updatedInput.prompt, /Team boundary/);
  const pack = JSON.parse(run(root, ['context', '--phase', 'check', '--json'], { env }).stdout);
  assert.ok(pack.files.some((f) => f.file === 'docs/review.md'));
  write(root, '.keelson/changes/sharing/context.json', JSON.stringify({ schema: 1, implement: ['missing.md'], check: [] }));
  assert.notEqual(run(root, ['start'], { env, allowFail: true }).code, 0);
  assert.equal(hook(root, 'Agent', { prompt: 'Implement sharing' }).permissionDecision, 'deny');
});

test('prompt restoration does not turn handwritten Verify text into passing evidence', () => {
  const root = project();
  const result = spawnSync('node', [path.resolve('hooks/prompt-state.mjs')], {
    cwd: root, env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8', input: '{}',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /verify passed/);
  assert.match(result.stdout, /planning/);
  assert.match(result.stdout, /signed current-tree evidence/);
});

test('modified plan and stale session cannot silently authorize new implementation', () => {
  const root = project();
  run(root, ['start'], { env });
  const plan = read(root, changeFile);
  write(root, changeFile, plan.replace('Share records with a team.', 'Share records publicly.'));
  assert.equal(hook(root, 'Write', { file_path: 'src/api.js' }).permissionDecision, 'deny');
  run(root, ['start'], { env });
  run(root, ['focus', '--clear'], { env });
  assert.equal(hook(root, 'Write', { file_path: 'src/api.js' }).permissionDecision, 'deny');
});

test('each agent receives nested scope rules and compaction restores injection', () => {
  const root = project();
  write(root, '.keelson/rules/index.md', '- `src/api/**` → api.md\n- `assets/**` → visuals.md\n');
  write(root, '.keelson/rules/visuals.md', 'Unrelated visual contract.');
  run(root, ['start'], { env });
  const pack = JSON.parse(run(root, ['context', '--phase', 'check', '--json'], { env }).stdout);
  assert.ok(pack.files.some((f) => f.file.endsWith('/api.md')));
  assert.ok(!pack.files.some((f) => f.file.endsWith('/visuals.md')));
  for (const id of ['worker-a', 'worker-b']) {
    const extra = { agent_id: id };
    assert.match(hook(root, 'Write', { file_path: 'src/api/client.js' }, extra).additionalContext, /Permission checks/);
    assert.equal(hook(root, 'Write', { file_path: 'src/api/client.js' }, extra).additionalContext, undefined);
  }
  const restored = spawnSync('node', [path.resolve('hooks/session-start.mjs')], {
    cwd: root, env: { ...process.env, ...env, CLAUDE_PROJECT_DIR: root }, encoding: 'utf8', input: '{"source":"compact"}',
  });
  assert.equal(restored.status, 0, restored.stderr);
  assert.match(restored.stdout, /Permission checks/);
  assert.match(hook(root, 'Write', { file_path: 'src/api/client.js' }, { agent_id: 'worker-a' }).additionalContext, /Permission checks/);
});

test('generic reviewer startup does not overwrite its check phase', () => {
  const root = project();
  const args = { prompt: 'KEELSON_PHASE=check\nReview sharing.', subagent_type: 'general-purpose' };
  assert.match(hook(root, 'Agent', args).updatedInput.prompt, /\[keelson\] check context/);
  const startup = hook(root, undefined, {}, { hook_event_name: 'SubagentStart', agent_type: 'general-purpose', agent_id: 'review-a' });
  assert.doesNotMatch(startup.additionalContext, /\[keelson\] implement context/);
  assert.match(startup.additionalContext, /Follow the phase/);
  const named = hook(root, undefined, {}, { hook_event_name: 'SubagentStart', agent_type: 'keelson-check', agent_id: 'review-b' });
  assert.match(named.additionalContext, /\[keelson\] check context/);
});

function nativeHook(root, host, name, input, cwd = root) {
  const result = spawnSync('node', [BIN, 'hook', name], {
    cwd, env: { ...process.env, KEELSON_SESSION_ID: '', CODEX_THREAD_ID: '', PI_SESSION_ID: '', CLAUDE_PROJECT_DIR: '', CODEBUDDY_PROJECT_DIR: '' },
    encoding: 'utf8', input: JSON.stringify({ cwd, session_id: `${host}-session`, ...input }),
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
const nativeEnv = (host) => hookEnvironment(host, { session_id: `${host}-session` }, { CODEX_THREAD_ID: '', PI_SESSION_ID: '' });

test('CodeBuddy gates edits, rewrites Task using modifiedInput, and restores focused contracts', () => {
  const root = project();
  const call = (tool, args = {}) => {
    const text = nativeHook(root, 'codebuddy', 'codebuddy-workflow', { hook_event_name: 'PreToolUse', tool_name: tool, tool_input: args });
    return text ? JSON.parse(text).hookSpecificOutput : {};
  };
  assert.equal(call('Write', { file_path: 'src/api.js' }).permissionDecision, 'deny');
  run(root, ['start', 'sharing'], { env: nativeEnv('codebuddy') });
  assert.deepEqual(call('Write', { file_path: 'src/api.js' }), {});
  assert.deepEqual(call('NotebookWrite', { notebook_path: 'analysis.ipynb' }), {});
  const review = call('Task', { prompt: 'KEELSON_PHASE=check\nReview sharing', description: 'review', model: 'inherit' });
  assert.equal(review.permissionDecision, undefined);
  assert.equal(review.updatedInput, undefined);
  assert.equal(review.modifiedInput.model, 'inherit');
  assert.match(review.modifiedInput.prompt, /\[keelson\] check context/);
  assert.match(review.modifiedInput.prompt, /Team boundary/);
  for (const event of ['UserPromptSubmit', 'SessionStart']) {
    const text = nativeHook(root, 'codebuddy', 'codebuddy-session', { hook_event_name: event, source: 'compact' });
    assert.match(text, /sharing: implement/);
    assert.match(text, /Permission checks/);
  }
  write(root, changeFile, read(root, changeFile).replace('Share records with a team.', 'Share publicly.'));
  assert.equal(call('NotebookWrite', { notebook_path: 'analysis.ipynb' }).permissionDecision, 'deny');
});

test('CodeBuddy shell identity survives subdirectories without bypassing host approvals', () => {
  const root = project();
  write(root, 'src/.keep', '');
  for (const tool of ['Bash', 'PowerShell']) {
    const text = nativeHook(root, 'codebuddy', 'codebuddy-session', {
      hook_event_name: 'PreToolUse', tool_name: tool, tool_input: { command: 'keelson status', description: 'inspect' },
    }, path.join(root, 'src'));
    const result = JSON.parse(text).hookSpecificOutput;
    assert.equal(result.permissionDecision, undefined);
    assert.match(result.modifiedInput.command, /KEELSON_SESSION_ID=/);
    assert.ok(result.modifiedInput.command.includes(nativeEnv('codebuddy').KEELSON_SESSION_ID));
    assert.equal(result.modifiedInput.description, 'inspect');
    assert.equal(result.updatedInput, undefined);
  }
});

test('Codex patch gate covers all paths and uses the same identity as native CLI commands', () => {
  const root = project();
  const call = (command, cwd = root) => {
    const text = nativeHook(root, 'codex', 'codex-workflow', { hook_event_name: 'PreToolUse', tool_name: 'apply_patch', tool_input: { command } }, cwd);
    return text ? JSON.parse(text).hookSpecificOutput : {};
  };
  const patch = '*** Begin Patch\n*** Add File: src/api.js\n+export {};\n*** End Patch';
  assert.equal(call(patch).permissionDecision, 'deny');
  assert.deepEqual(call('*** Begin Patch\n*** Add File: .keelson/notes.md\n+Plan\n*** End Patch'), {});
  assert.equal(call('*** Begin Patch\n*** Update File: .keelson/notes.md\n*** Move to: src/api.js\n@@\n-old\n+new\n*** End Patch').permissionDecision, 'deny');
  // CODEX_THREAD_ID is exported by Codex itself; the hook's session_id must bind to it.
  run(root, ['start', 'sharing'], { env: { CODEX_THREAD_ID: 'codex-session' } });
  const allowed = call(patch);
  assert.equal(allowed.permissionDecision, undefined);
  assert.match(allowed.additionalContext, /Permission checks/);
  run(root, ['focus', '--clear'], { env: { CODEX_THREAD_ID: 'codex-session' } });
  write(root, 'src/.keep', '');
  assert.equal(call('*** Begin Patch\n*** Add File: .keelson/fake.md\n+x\n*** End Patch', path.join(root, 'src')).permissionDecision, 'deny');
});

test('Codex restores compacted contracts and supplies child phase packs without an allow decision', () => {
  const root = project();
  run(root, ['start', 'sharing'], { env: { CODEX_THREAD_ID: 'codex-session' } });
  for (const event of ['SessionStart', 'UserPromptSubmit']) {
    const result = JSON.parse(nativeHook(root, 'codex', 'codex-session', { hook_event_name: event, source: 'compact' })).hookSpecificOutput;
    assert.equal(result.hookEventName, event);
    assert.match(result.additionalContext, /sharing: implement/);
    assert.match(result.additionalContext, /Permission checks/);
  }
  const result = JSON.parse(nativeHook(root, 'codex', 'codex-workflow', {
    hook_event_name: 'SubagentStart', agent_type: 'default', agent_id: 'reviewer',
  })).hookSpecificOutput;
  assert.match(result.additionalContext, /Preserve your assigned scope/);
  assert.match(result.additionalContext, /keelson focus/);
  assert.doesNotMatch(result.additionalContext, /Team boundary/); // No guessed root context.
  run(root, ['focus', 'sharing'], { env: { CODEX_THREAD_ID: 'reviewer' } });
  const resumed = JSON.parse(nativeHook(root, 'codex', 'codex-workflow', {
    hook_event_name: 'SubagentStart', agent_type: 'default', agent_id: 'reviewer',
  })).hookSpecificOutput;
  assert.match(resumed.additionalContext, /\[keelson\] check context/);
  assert.match(resumed.additionalContext, /\[keelson\] implement context/);
  const spawning = JSON.parse(nativeHook(root, 'codex', 'codex-workflow', {
    hook_event_name: 'PreToolUse', tool_name: 'spawn_agent', tool_input: { message: 'KEELSON_CHANGE=sharing\nKEELSON_PHASE=check\nReview sharing', agent_type: 'default' },
  })).hookSpecificOutput;
  assert.equal(spawning.permissionDecision, undefined);
  assert.equal(spawning.updatedInput, undefined);
  assert.match(spawning.additionalContext, /\[keelson\] check context/);
});

test('Codex nested children bind explicit tasks and isolate CLI focus, gates and context caches', () => {
  const root = project();
  const parentEnv = { CODEX_THREAD_ID: 'codex-session' };
  const childEnv = (id) => ({ CODEX_THREAD_ID: id });
  run(root, ['start', 'sharing'], { env: parentEnv });
  const call = (agent_id, event = 'PreToolUse') => {
    const text = nativeHook(root, 'codex', 'codex-workflow', {
      hook_event_name: event, agent_id, agent_type: 'default', tool_name: 'apply_patch',
      tool_input: { command: '*** Begin Patch\n*** Add File: src/api.js\n+export {};\n*** End Patch' },
    });
    return text ? JSON.parse(text).hookSpecificOutput : {};
  };
  for (const id of ['worker-a', 'worker-b']) {
    assert.match(call(id, 'SubagentStart').additionalContext, /keelson focus/);
    assert.equal(call(id).permissionDecision, 'deny');
    run(root, ['focus', 'sharing'], { env: childEnv(id) });
    const cli = JSON.parse(run(root, ['context', '--json'], { env: childEnv(id) }).stdout);
    assert.equal(cli.focus, 'sharing');
    assert.match(call(id).additionalContext, /Permission checks/);
    // Children can compact without a SessionStart event; repeated tool calls
    // must still restore the contract instead of trusting an old digest cache.
    assert.match(call(id).additionalContext, /Permission checks/);
  }
  const other = '.keelson/changes/billing/change.md';
  write(root, other, read(root, changeFile).replace('status: in-progress', 'status: clarifying').replace('Share records with a team.', 'Require billing authorization.'));
  run(root, ['focus', 'billing'], { env: childEnv('worker-a') });
  assert.equal(call('worker-a').permissionDecision, 'deny');
  assert.equal(call('worker-b').permissionDecision, undefined);
  assert.equal(call(undefined).permissionDecision, undefined); // Legacy events use session_id.
  run(root, ['start', 'billing'], { env: childEnv('worker-a') });
  assert.match(call('worker-a').additionalContext, /Require billing authorization/);
  assert.match(call('worker-a', 'SubagentStart').additionalContext, /Require billing authorization/);
  assert.equal(readSession(root, childEnv('worker-a')).state.change, 'billing');
  assert.equal(readSession(root, parentEnv).state.change, 'sharing');
  assert.equal(readSession(root, childEnv('worker-b')).state.change, 'sharing');
  const spawn = (id, message) => {
    const text = nativeHook(root, 'codex', 'codex-workflow', {
      hook_event_name: 'PreToolUse', agent_id: id, tool_name: 'spawn_agent', tool_input: { message },
    });
    return text ? JSON.parse(text).hookSpecificOutput : {};
  };
  for (const message of ['Review billing', 'KEELSON_CHANGE=sharing', 'KEELSON_CHANGE=billing\nKEELSON_CHANGE=billing']) {
    assert.equal(spawn('worker-a', message).permissionDecision, 'deny');
  }
  const grandchildTask = 'KEELSON_CHANGE=billing\nKEELSON_PHASE=check\nReview billing without editing.';
  assert.equal(spawn('worker-a', grandchildTask).permissionDecision, undefined);
  assert.doesNotMatch(call('grandchild', 'SubagentStart').additionalContext, /Team boundary/);
  assert.equal(call('grandchild').permissionDecision, 'deny');
  run(root, ['focus', 'billing'], { env: childEnv('grandchild') });
  const grandchildPack = JSON.parse(run(root, ['context', '--phase', 'check', '--json'], { env: childEnv('grandchild') }).stdout);
  assert.equal(grandchildPack.change, 'billing');
  assert.match(call('grandchild').additionalContext, /Require billing authorization/);
  run(root, ['focus', '--clear'], { env: childEnv('worker-a') });
  call('worker-a', 'SubagentStart');
  assert.equal(call('worker-a').permissionDecision, 'deny'); // A cleared child never re-inherits.
  run(root, ['focus', '--clear'], { env: parentEnv });
  assert.equal(spawn(undefined, 'Investigate repository facts, read-only').permissionDecision, undefined);
  call('unfocused-child', 'SubagentStart');
  assert.equal(call('unfocused-child').permissionDecision, 'deny');
});

test('three required hosts install, repair and remove native hooks without touching neighboring settings', () => {
  const root = tmpProject({ '.codex/config.toml': '# Owner configuration\n' });
  const hosts = [
    ['claude', '.claude/settings.json', 'CLAUDE.md', '.claude/skills/keelson/SKILL.md', 'workflow-guard'],
    ['codex', '.codex/hooks.json', 'AGENTS.md', '.agents/skills/keelson/SKILL.md', 'codex-workflow'],
    ['codebuddy', '.codebuddy/settings.json', 'CODEBUDDY.md', '.codebuddy/skills/keelson/SKILL.md', 'codebuddy-workflow'],
  ];
  for (const [, settings, , , script] of hosts) write(root, settings, JSON.stringify({ owner: true, hooks: { PreToolUse: [{ matcher: 'owner-only', hooks: [
    { type: 'command', command: `keelson hook ${script}` }, { type: 'command', command: 'echo owner' },
  ] }] } }));
  run(root, ['init', '--tools', 'claude,codex,codebuddy'], { env });
  for (const [, settings, instructions, skill, script] of hosts) {
    assert.ok(exists(root, skill));
    assert.match(read(root, instructions), /keelson guide/);
    const actual = JSON.parse(read(root, settings));
    assert.deepEqual(actual.hooks.PreToolUse[0], { matcher: 'owner-only', hooks: [{ type: 'command', command: 'echo owner' }] });
    assert.ok(actual.hooks.PreToolUse.some((g) => g.matcher !== 'owner-only' && g.hooks.some((h) => h.command === `keelson hook ${script}`)));
  }
  assert.equal(read(root, '.codex/config.toml'), '# Owner configuration\n');
  const codex = JSON.parse(read(root, '.codex/hooks.json'));
  delete codex.hooks.SubagentStart;
  write(root, '.codex/hooks.json', JSON.stringify(codex));
  assert.notEqual(run(root, ['doctor'], { env, allowFail: true }).code, 0);
  run(root, ['update'], { env });
  assert.ok(JSON.parse(read(root, '.codex/hooks.json')).hooks.SubagentStart);
  const snapshot = hosts.map(([, settings]) => read(root, settings));
  run(root, ['update'], { env });
  assert.deepEqual(hosts.map(([, settings]) => read(root, settings)), snapshot);
  const report = JSON.parse(run(root, ['platforms', '--json'], { env }).stdout);
  for (const [id] of hosts) assert.equal(report.find((p) => p.id === id).hooks, true);
  run(root, ['ablate'], { env });
  for (const [, settings] of hosts) assert.doesNotMatch(exists(root, settings) ? read(root, settings) : '', /"keelson hook/);
  run(root, ['restore'], { env });
  assert.deepEqual(hosts.map(([, settings]) => read(root, settings)), snapshot);
  run(root, ['update', '--no-hooks'], { env });
  for (const [, settings] of hosts) assert.deepEqual(JSON.parse(read(root, settings)), { owner: true, hooks: { PreToolUse: [{ matcher: 'owner-only', hooks: [{ type: 'command', command: 'echo owner' }] }] } });
});
