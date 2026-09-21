import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { exists, read, readJson, readOr, rmrf, write, writeJson } from '../lib/fs.js';
import { installTargets, PLATFORMS } from './registry.js';
import { captureRuntimeOwnership, managedSkillShimMatches, residentBlock } from './runtime.js';

export const MANAGED_STATE = path.join('.keelson', 'manifest.json');
export const LEGACY_MANAGED_STATE = path.join('.keelson', '.managed.json');

// v0.3 copied these package scripts into the project. Retire only exact known
// copies, including the older installed snapshot committed in f6ce125 itself.
// A user amendment or symbolic link is their file, not ours.
const LEGACY_COPIED_HOOK_HASHES = new Map([
  ['session-start.mjs', new Set([
    '2c425e68f52b1b9c8febeb410916b14b302893bf0b241ea1b9ba4275452ee217',
    '2b2f3523abaf14671764a0f1967ad649881013cc8cc3cb70b51e91b4b5d9dee7',
  ])],
  ['prompt-state.mjs', new Set([
    'cd7301e7efa00368a437d8a3e084844df1cd611969ae2465c82d8ac8f6707131',
    '10cf6cb9781c58330160602d85dcd2d417bc11c1e99223a7e55477a2529448a7',
  ])],
  ['codebuddy-session.mjs', new Set(['cbdcbac42ab752387721c3b53f9fae50a22e04d2e04dbb612dba45d90efc25a8'])],
]);

export const LEGACY_MANAGED_PATHS = [
  '.cursor/skills/keelson',
  '.cursor/rules/keelson.mdc',
  '.github/skills/keelson',
  '.kilocode/skills/keelson',
  '.kilocode/rules/keelson.md',
  '.kiro/steering/keelson.md',
  '.qoder/skills/keelson',
  '.qoder/rules/keelson.md',
  '.codebuddy/rules/keelson.md',
  '.pi/skills/keelson',
  '.agent/skills/keelson',
  '.agent/rules/keelson.md',
  '.devin/skills/keelson',
  '.factory/skills/keelson',
  '.reasonix/skills/keelson',
  '.zcode/skills/keelson',
  '.trae/skills/keelson',
  '.trae/rules/keelson.md',
  '.grok/skills/keelson',
  '.kimi/skills/keelson',
  '.snow/skills/keelson',
];

const managedTarget = (t) => ({
  id: t.id ?? null,
  label: t.label ?? t.id ?? 'managed surface',
  instructions: t.instructions,
  skillsDir: t.skillsDir,
  instructionsFormat: t.instructionsFormat ?? null,
  rulesFile: t.rulesFile ?? null,
  rulesFormat: t.rulesFormat ?? null,
  hooks: Boolean(t.hooks),
  sessionAdapter: t.sessionAdapter ?? null,
});
const sessionAdapterPaths = () => [];
const targetKey = (t) => [t.instructions, t.skillsDir, t.instructionsFormat ?? '', t.rulesFile ?? '', t.rulesFormat ?? '', Boolean(t.hooks), t.sessionAdapter ?? ''].join('|');
const managedSurfacePaths = (t) => [path.join(t.skillsDir, 'keelson'), t.instructions, t.rulesFile, ...sessionAdapterPaths(t)].filter(Boolean);

export function readManagedState(root) {
  return readJson(path.join(root, MANAGED_STATE), null) ?? readJson(path.join(root, LEGACY_MANAGED_STATE), null);
}

export function managedTargets(root) {
  const state = readManagedState(root);
  return Array.isArray(state?.targets) ? state.targets : [];
}

export function removeLegacyCopiedHooks(root) {
  const hooksDir = path.join(root, '.keelson', 'hooks');
  const removed = [];
  const preserved = [];
  for (const [name, expectedHashes] of LEGACY_COPIED_HOOK_HASHES) {
    const target = path.join(hooksDir, name);
    const rel = path.join('.keelson', 'hooks', name);
    const stat = fs.lstatSync(target, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) { preserved.push(rel); continue; }
    if (!stat?.isFile()) continue;
    const actualHash = crypto.createHash('sha256').update(read(target).replace(/\r\n?/g, '\n')).digest('hex');
    if (expectedHashes.has(actualHash)) {
      rmrf(target);
      removed.push(rel);
    } else preserved.push(rel);
  }
  if (exists(hooksDir) && fs.readdirSync(hooksDir).length === 0) rmrf(hooksDir);
  return { removed, preserved };
}

export function managedStateMatches(root, targets) {
  const state = readManagedState(root);
  if (!state || Number(state.schema ?? state.version) !== 1) return false;
  const a = JSON.stringify((state.targets ?? []).map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  const b = JSON.stringify(targets.map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  return a === b;
}

export function writeManagedState(root, targets, packageVersion, { vendor = false } = {}) {
  writeJson(path.join(root, MANAGED_STATE), { schema: 1, packageVersion, vendor: Boolean(vendor), targets: targets.map(managedTarget), runtime: captureRuntimeOwnership(root, targets, vendor) });
  if (exists(path.join(root, LEGACY_MANAGED_STATE))) rmrf(path.join(root, LEGACY_MANAGED_STATE));
  return MANAGED_STATE;
}

export function staleManagedTargets(root, targets) {
  const current = new Set(targets.map(targetKey));
  return managedTargets(root).filter((t) => !current.has(targetKey(t)));
}

export function legacyManagedRemovals(root, targets) {
  // Older releases did not record byte-level ownership for these retired paths.
  // A title or frontmatter is not sufficient proof that a directory is ours.
  // Keep unknown legacy content for the owner to review instead of deleting it.
  return [];
}

export function plannedManagedRemovals(root, targets) {
  const keep = new Set(targets.flatMap(managedSurfacePaths));
  return [...new Set([
    ...staleManagedTargets(root, targets).flatMap(managedSurfacePaths).filter((rel) => !keep.has(rel)),
    ...legacyManagedRemovals(root, targets),
  ])].filter((rel) => exists(path.join(root, rel)));
}

const START = '<!-- keelson:start -->';
const END = '<!-- keelson:end -->';

export function upsertBlock(existing, block) {
  const body = block.trim();
  if (existing.includes(START) && existing.includes(END)) {
    return existing.replace(new RegExp(`${START}[\\s\\S]*?${END}`), body);
  }
  const sep = existing.trim() ? (existing.endsWith('\n') ? '\n' : '\n\n') : '';
  return existing + sep + body + '\n';
}

export function removeBlock(existing) {
  const stripped = existing.replace(new RegExp(`\\n*${START}[\\s\\S]*?${END}\\n?`), '');
  if (!stripped.trim()) return '';
  return stripped.replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n');
}

const stripMarkers = (block) => block.replace(START, '').replace(END, '').trim();

export function installInstructions(root, target, { lang }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const block = residentBlock(lang);
  const touched = [];
  const file = path.join(root, p.instructions);
  if (p.instructionsFormat === 'kiro') {
    const existing = readOr(file, '');
    const front = existing.match(/^(---\n[\s\S]*?\n---\n?)/)?.[1];
    if (front) write(file, front.replace(/\n*$/, '\n\n') + upsertBlock(existing.slice(front.length), block));
    else if (existing) write(file, upsertBlock(existing, block));
    else write(file, `---\ninclusion: always\n---\n\n${block.trim()}\n`);
  } else {
    write(file, upsertBlock(readOr(file, ''), block));
  }
  touched.push(path.relative(root, file));
  if (p.rulesFile) {
    const rf = path.join(root, p.rulesFile);
    const body = stripMarkers(block);
    write(rf, p.rulesFormat === 'mdc' ? `---\ndescription: Keelson project workflow\nalwaysApply: true\n---\n\n${body}\n` : `${body}\n`);
    touched.push(path.relative(root, rf));
  }
  return touched;
}

const LEGACY_CLAUDE_HOOK_COMMANDS = new Set([
  'node "$CLAUDE_PROJECT_DIR/.keelson/hooks/session-start.mjs"',
  'node "$CLAUDE_PROJECT_DIR/.keelson/hooks/prompt-state.mjs"',
]);
const CLAUDE_HOOK_COMMANDS = new Set(['keelson hook session-start', 'keelson hook prompt-state', 'keelson hook workflow-guard', ...LEGACY_CLAUDE_HOOK_COMMANDS]);
const isClaudeHook = (hook) => hook?.type === 'command' && CLAUDE_HOOK_COMMANDS.has(String(hook.command));

export function installHooks(root) {
  removeHooks(root);
  const settingsPath = path.join(root, '.claude', 'settings.json');
  const settings = readJson(settingsPath, {}) ?? {};
  settings.hooks ??= {};
  const ensure = (event, matcher, script) => {
    settings.hooks[event] ??= [];
    const command = `keelson hook ${script.replace(/\.mjs$/, '')}`;
    const already = settings.hooks[event].some((g) => (g.hooks ?? []).some((h) => h?.type === 'command' && h.command === command));
    if (already) return;
    const group = { hooks: [{ type: 'command', command, timeout: 10 }] };
    if (matcher) group.matcher = matcher;
    settings.hooks[event].push(group);
  };
  ensure('SessionStart', 'startup|resume|clear|compact', 'session-start.mjs');
  ensure('UserPromptSubmit', null, 'prompt-state.mjs');
  ensure('PreToolUse', 'Edit|Write|MultiEdit|NotebookEdit|Agent|Task', 'workflow-guard.mjs');
  ensure('SubagentStart', null, 'workflow-guard.mjs');
  writeJson(settingsPath, settings);
  return ['.claude/settings.json'];
}

export function removeHooks(root, { legacyOnly = false } = {}) {
  const settingsPath = path.join(root, '.claude', 'settings.json');
  const settings = readJson(settingsPath, null);
  if (!settings?.hooks) return;
  let changed = false;
  for (const ev of Object.keys(settings.hooks)) {
    const groups = settings.hooks[ev].map((g) => {
      const hooks = (g.hooks ?? []).filter((h) => !isClaudeHook(h) || (legacyOnly && !LEGACY_CLAUDE_HOOK_COMMANDS.has(h.command)));
      if (hooks.length === (g.hooks ?? []).length) return g;
      changed = true;
      return hooks.length ? { ...g, hooks } : null;
    }).filter(Boolean);
    settings.hooks[ev] = groups;
    if (!settings.hooks[ev].length) delete settings.hooks[ev];
  }
  if (!changed) return;
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  writeJson(settingsPath, settings);
}

const LEGACY_CODEBUDDY_SESSION_COMMAND = 'node "$CODEBUDDY_PROJECT_DIR/.keelson/hooks/codebuddy-session.mjs"';
const HOST_HOOKS = {
  'codebuddy-hooks': {
    file: '.codebuddy/settings.json',
    registrations: [
      ['SessionStart', null, 'codebuddy-session'],
      ['UserPromptSubmit', null, 'codebuddy-session'],
      ['PreToolUse', 'Bash|PowerShell', 'codebuddy-session'],
      ['PreToolUse', '^(Edit|Write|MultiEdit|NotebookEdit|NotebookWrite|Agent|Task)$', 'codebuddy-workflow'],
    ],
  },
  'codex-thread-env': {
    file: '.codex/hooks.json',
    registrations: [
      ['SessionStart', null, 'codex-session'],
      ['UserPromptSubmit', null, 'codex-session'],
      ['PreToolUse', '^(apply_patch|Edit|Write|Agent|spawn_agent)$', 'codex-workflow'],
      ['SubagentStart', null, 'codex-workflow'],
    ],
  },
};
const adapterFor = (target) => HOST_HOOKS[target?.sessionAdapter];
const isAdapterHook = (h, adapter) => h?.type === 'command' && adapter.registrations.some(([, , name]) => h.command === `keelson hook ${name}`);
const hasRegistration = (settings, [event, matcher, name]) => (settings.hooks?.[event] ?? []).some((g) =>
  (g.matcher ?? null) === matcher && (g.hooks ?? []).some((h) => h.type === 'command' && h.command === `keelson hook ${name}`));

function removeAdapterHooks(root, adapter) {
  const settingsPath = path.join(root, adapter.file);
  const settings = readJson(settingsPath, null);
  if (!settings?.hooks) return false;
  let changed = false;
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].map((g) => {
      const hooks = (g.hooks ?? []).filter((h) => !isAdapterHook(h, adapter) &&
        !(adapter.file.startsWith('.codebuddy/') && h?.type === 'command' && h.command === LEGACY_CODEBUDDY_SESSION_COMMAND));
      if (hooks.length === (g.hooks ?? []).length) return g;
      changed = true;
      return hooks.length ? { ...g, hooks } : null;
    }).filter(Boolean);
    if (!settings.hooks[event].length) delete settings.hooks[event];
  }
  if (!changed) return false;
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  if (!Object.keys(settings).length) rmrf(settingsPath);
  else writeJson(settingsPath, settings);
  return true;
}

export function installSessionAdapter(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const adapter = adapterFor(p);
  if (!adapter) return [];
  // Split owned hooks out of mixed groups; never change a user's matcher.
  removeAdapterHooks(root, adapter);
  const settingsPath = path.join(root, adapter.file);
  const settings = readJson(settingsPath, {}) ?? {};
  settings.hooks ??= {};
  for (const [event, matcher, name] of adapter.registrations) {
    settings.hooks[event] ??= [];
    settings.hooks[event].push({
      ...(matcher ? { matcher } : {}),
      hooks: [{ type: 'command', command: `keelson hook ${name}`, timeout: 10 }],
    });
  }
  writeJson(settingsPath, settings);
  return [adapter.file];
}

export function plannedSessionAdapterFiles(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const adapter = adapterFor(p);
  if (!adapter) return [];
  const file = path.join(root, adapter.file);
  const settings = readJson(file, {}) ?? {};
  const ready = adapter.registrations.every((registration) => hasRegistration(settings, registration));
  return [{ path: `${adapter.file} (Keelson workflow hooks)`, status: ready ? 'unchanged' : exists(file) ? 'update' : 'create' }];
}

export function removeSessionAdapter(root, target, keep = new Set()) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const adapter = adapterFor(p);
  return adapter && removeAdapterHooks(root, adapter) ? [`${adapter.file} (Keelson hooks)`] : [];
}

export function sessionAdapterProblems(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const adapter = adapterFor(p);
  if (!adapter) return [];
  const settings = readJson(path.join(root, adapter.file), {}) ?? {};
  return adapter.registrations.filter((r) => !hasRegistration(settings, r))
    .map(([event, matcher, name]) => `${p.label}: ${event}${matcher ? ` (${matcher})` : ''} hook ${name} not registered`);
}

function removeTargetSurfaces(root, p, keep = new Set()) {
  const removed = [];
  const skillRel = path.join(p.skillsDir, 'keelson');
  const skill = path.join(root, skillRel);
  const managed = readManagedState(root);
  if (!keep.has(skillRel) && exists(skill) && managedSkillShimMatches(root, p, managed?.packageVersion, managed)) {
    rmrf(skill);
    removed.push(path.relative(root, skill));
  }
  const insRel = p.instructions;
  const ins = path.join(root, insRel);
  if (!keep.has(insRel) && exists(ins)) {
    write(ins, removeBlock(read(ins)));
    removed.push(path.relative(root, ins));
  }
  if (p.rulesFile && !keep.has(p.rulesFile) && exists(path.join(root, p.rulesFile))) {
    rmrf(path.join(root, p.rulesFile));
    removed.push(p.rulesFile);
  }
  if (p.hooks && p.id === 'claude' && !keep.has('.claude/settings.json')) removeHooks(root);
  removed.push(...removeSessionAdapter(root, p, keep));
  return removed;
}

export function reconcileManagedTargets(root, targets) {
  const removed = [];
  const stale = staleManagedTargets(root, targets);
  const keep = new Set(targets.flatMap(managedSurfacePaths));
  if (targets.some((p) => p.hooks && p.id === 'claude')) keep.add('.claude/settings.json');
  for (const p of stale) removed.push(...removeTargetSurfaces(root, p, keep));
  for (const rel of legacyManagedRemovals(root, targets)) {
    rmrf(path.join(root, rel));
    removed.push(rel);
  }
  if (stale.some((p) => p.hooks && p.id === 'claude') && !targets.some((p) => p.hooks && p.id === 'claude')) {
    removeHooks(root);
  }
  return [...new Set(removed)];
}

export function removeSurfaces(root, tools, cfg = null) {
  const stateTargets = managedTargets(root);
  const targets = stateTargets.length ? stateTargets : installTargets(tools.filter((t) => PLATFORMS[t]), cfg);
  const removed = [];
  for (const p of targets) removed.push(...removeTargetSurfaces(root, p));
  removeHooks(root);
  for (const rel of [MANAGED_STATE, LEGACY_MANAGED_STATE]) {
    if (!exists(path.join(root, rel))) continue;
    rmrf(path.join(root, rel));
    removed.push(rel);
  }
  return [...new Set(removed)];
}
