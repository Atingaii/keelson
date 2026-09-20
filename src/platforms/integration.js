import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { exists, read, readJson, readOr, rmrf, write, writeJson } from '../lib/fs.js';
import { installTargets, PLATFORMS } from './registry.js';
import { managedSkillShimMatches, residentBlock } from './runtime.js';

export const MANAGED_STATE = path.join('.keelson', 'manifest.json');
export const LEGACY_MANAGED_STATE = path.join('.keelson', '.managed.json');

// v0.3 copied these package scripts into the project.  Retire only byte-for-byte
// known copies: a user amendment to an old hook is their file, not ours.
const LEGACY_COPIED_HOOK_HASHES = new Map([
  ['session-start.mjs', '2c425e68f52b1b9c8febeb410916b14b302893bf0b241ea1b9ba4275452ee217'],
  ['prompt-state.mjs', 'cd7301e7efa00368a437d8a3e084844df1cd611969ae2465c82d8ac8f6707131'],
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
  for (const [name, expectedHash] of LEGACY_COPIED_HOOK_HASHES) {
    const target = path.join(hooksDir, name);
    if (!exists(target) || !fs.statSync(target).isFile()) continue;
    const actualHash = crypto.createHash('sha256').update(read(target).replace(/\r\n?/g, '\n')).digest('hex');
    const rel = path.join('.keelson', 'hooks', name);
    if (actualHash === expectedHash) {
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
  writeJson(path.join(root, MANAGED_STATE), { schema: 1, packageVersion, vendor: Boolean(vendor), targets: targets.map(managedTarget) });
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
const CLAUDE_HOOK_COMMANDS = new Set(['keelson hook session-start', 'keelson hook prompt-state', ...LEGACY_CLAUDE_HOOK_COMMANDS]);
const isClaudeHook = (hook) => hook?.type === 'command' && CLAUDE_HOOK_COMMANDS.has(String(hook.command));

export function installHooks(root) {
  removeHooks(root, { legacyOnly: true });
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

const CODEBUDDY_SESSION_COMMAND = 'keelson hook codebuddy-session';
const LEGACY_CODEBUDDY_SESSION_COMMAND = 'node "$CODEBUDDY_PROJECT_DIR/.keelson/hooks/codebuddy-session.mjs"';
const isCodeBuddyHook = (hook) => hook?.type === 'command' && hook.command === CODEBUDDY_SESSION_COMMAND;

function ensureCodeBuddyHook(settings, event, matcher = null) {
  settings.hooks ??= {};
  settings.hooks[event] ??= [];
  const found = settings.hooks[event].find((g) =>
    (g.hooks ?? []).some(isCodeBuddyHook),
  );
  if (found) {
    if (matcher && found.matcher !== matcher) found.matcher = matcher;
    else if (!matcher && 'matcher' in found) delete found.matcher;
    return;
  }
  const group = {
    hooks: [{
      type: 'command',
      command: CODEBUDDY_SESSION_COMMAND,
      timeout: 10,
    }],
  };
  if (matcher) group.matcher = matcher;
  settings.hooks[event].push(group);
}

export function installSessionAdapter(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  if (!p?.sessionAdapter || p.sessionAdapter === 'pi-env' || p.sessionAdapter === 'claude-hooks') return [];

  if (p.sessionAdapter === 'codebuddy-hooks') {
    removeCodeBuddyHooks(root, { legacyOnly: true });
    const settingsPath = path.join(root, '.codebuddy', 'settings.json');
    const settings = readJson(settingsPath, {}) ?? {};
    ensureCodeBuddyHook(settings, 'SessionStart');
    ensureCodeBuddyHook(settings, 'UserPromptSubmit');
    ensureCodeBuddyHook(settings, 'PreToolUse', 'Bash|PowerShell');
    writeJson(settingsPath, settings);
    return [path.relative(root, settingsPath)];
  }

  return [];
}

export function plannedSessionAdapterFiles(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const rows = [];
  if (!p?.sessionAdapter || p.sessionAdapter === 'pi-env' || p.sessionAdapter === 'claude-hooks') return rows;

  if (p.sessionAdapter === 'codebuddy-hooks') {
    const settings = readJson(path.join(root, '.codebuddy', 'settings.json'), {}) ?? {};
    const has = (event, matcher = null) => (settings.hooks?.[event] ?? []).some((g) =>
      (matcher === null || g.matcher === matcher) &&
      (g.hooks ?? []).some(isCodeBuddyHook),
    );
    const ready = has('SessionStart') && has('UserPromptSubmit') && has('PreToolUse', 'Bash|PowerShell');
    rows.push({ path: '.codebuddy/settings.json (Keelson session hooks)', status: ready ? 'unchanged' : exists(path.join(root, '.codebuddy', 'settings.json')) ? 'update' : 'create' });
  }

  return rows;
}

function removeCodeBuddyHooks(root, { legacyOnly = false } = {}) {
  const settingsPath = path.join(root, '.codebuddy', 'settings.json');
  const settings = readJson(settingsPath, null);
  if (!settings?.hooks) return false;
  let changed = false;
  for (const event of Object.keys(settings.hooks)) {
    settings.hooks[event] = settings.hooks[event].map((g) => {
      const hooks = (g.hooks ?? []).filter((h) =>
        !(h?.type === 'command' && h.command === LEGACY_CODEBUDDY_SESSION_COMMAND) && (legacyOnly || !isCodeBuddyHook(h)),
      );
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

export function removeSessionAdapter(root, target, keep = new Set()) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const removed = [];
  if (p?.sessionAdapter === 'codebuddy-hooks') {
    if (removeCodeBuddyHooks(root)) removed.push('.codebuddy/settings.json (Keelson hooks)');
  }
  return removed;
}

export function sessionAdapterProblems(root, target) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const problems = [];
  if (!p?.sessionAdapter || p.sessionAdapter === 'pi-env' || p.sessionAdapter === 'claude-hooks') return problems;

  if (p.sessionAdapter === 'codebuddy-hooks') {
    const settings = readJson(path.join(root, '.codebuddy', 'settings.json'), {}) ?? {};
    const has = (event, matcher = null) => (settings.hooks?.[event] ?? []).some((g) =>
      (matcher === null || g.matcher === matcher) &&
      (g.hooks ?? []).some(isCodeBuddyHook),
    );
    if (!has('SessionStart')) problems.push(`${p.label}: SessionStart session hook not registered`);
    if (!has('UserPromptSubmit')) problems.push(`${p.label}: UserPromptSubmit session hook not registered`);
    if (!has('PreToolUse', 'Bash|PowerShell')) problems.push(`${p.label}: Bash|PowerShell PreToolUse session hook not registered`);
  }

  return problems;
}

function removeTargetSurfaces(root, p, keep = new Set()) {
  const removed = [];
  const skillRel = path.join(p.skillsDir, 'keelson');
  const skill = path.join(root, skillRel);
  const managed = readManagedState(root);
  if (!keep.has(skillRel) && exists(skill) && managedSkillShimMatches(root, p, managed?.packageVersion)) {
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
  if (p.hooks && !keep.has('.claude/settings.json')) removeHooks(root);
  removed.push(...removeSessionAdapter(root, p, keep));
  return removed;
}

export function reconcileManagedTargets(root, targets) {
  const removed = [];
  const stale = staleManagedTargets(root, targets);
  const keep = new Set(targets.flatMap(managedSurfacePaths));
  if (targets.some((p) => p.hooks)) keep.add('.claude/settings.json');
  for (const p of stale) removed.push(...removeTargetSurfaces(root, p, keep));
  for (const rel of legacyManagedRemovals(root, targets)) {
    rmrf(path.join(root, rel));
    removed.push(rel);
  }
  if (stale.some((p) => p.hooks) && !targets.some((p) => p.hooks)) {
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
