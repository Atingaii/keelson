import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { exists, mkdirp, read, readJson, readOr, rmrf, write, writeJson } from '../lib/fs.js';
import { installTargets, PLATFORMS } from './registry.js';
import { residentBlock } from './runtime.js';

export const MANAGED_STATE = path.join('.keelson', 'manifest.json');
export const LEGACY_MANAGED_STATE = path.join('.keelson', '.managed.json');

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
});
const targetKey = (t) => [t.instructions, t.skillsDir, t.instructionsFormat ?? '', t.rulesFile ?? '', t.rulesFormat ?? '', Boolean(t.hooks)].join('|');
const managedSurfacePaths = (t) => [path.join(t.skillsDir, 'keelson'), t.instructions, t.rulesFile].filter(Boolean);

export function readManagedState(root) {
  return readJson(path.join(root, MANAGED_STATE), null) ?? readJson(path.join(root, LEGACY_MANAGED_STATE), null);
}

export function managedTargets(root) {
  const state = readManagedState(root);
  return Array.isArray(state?.targets) ? state.targets : [];
}

export function managedStateMatches(root, targets) {
  const state = readManagedState(root);
  if (!state || Number(state.schema ?? state.version) !== 1) return false;
  const a = JSON.stringify((state.targets ?? []).map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  const b = JSON.stringify(targets.map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  return a === b;
}

export function writeManagedState(root, targets, packageVersion) {
  writeJson(path.join(root, MANAGED_STATE), { schema: 1, packageVersion, targets: targets.map(managedTarget) });
  if (exists(path.join(root, LEGACY_MANAGED_STATE))) rmrf(path.join(root, LEGACY_MANAGED_STATE));
  return MANAGED_STATE;
}

export function staleManagedTargets(root, targets) {
  const current = new Set(targets.map(targetKey));
  return managedTargets(root).filter((t) => !current.has(targetKey(t)));
}

function looksKeelsonOwned(root, rel) {
  const target = path.join(root, rel);
  if (!exists(target)) return false;
  const candidate = fs.statSync(target).isDirectory() ? path.join(target, 'SKILL.md') : target;
  if (!exists(candidate)) return false;
  const text = readOr(candidate, '');
  return /^name:\s*keelson\s*$/m.test(text) || /<!-- keelson:start -->|#\s+Keelson|Keelson project workflow/i.test(text);
}

export function legacyManagedRemovals(root, targets) {
  const current = new Set(targets.flatMap(managedSurfacePaths));
  return LEGACY_MANAGED_PATHS.filter((rel) => !current.has(rel) && looksKeelsonOwned(root, rel));
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
    write(file, `---\ninclusion: always\n---\n\n${stripMarkers(block)}\n`);
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

const HOOK_MARK = '.keelson/hooks/';

export function installHooks(root) {
  const hooksDir = path.join(root, '.keelson', 'hooks');
  mkdirp(hooksDir);
  for (const f of ['session-start.mjs', 'prompt-state.mjs']) write(path.join(hooksDir, f), read(path.join(PKG_ROOT, 'hooks', f)));
  const settingsPath = path.join(root, '.claude', 'settings.json');
  const settings = readJson(settingsPath, {}) ?? {};
  settings.hooks ??= {};
  const ensure = (event, matcher, script) => {
    settings.hooks[event] ??= [];
    const already = settings.hooks[event].some((g) => (g.hooks ?? []).some((h) => String(h.command ?? '').includes(`${HOOK_MARK}${script}`)));
    if (already) return;
    const group = { hooks: [{ type: 'command', command: `node "$CLAUDE_PROJECT_DIR/.keelson/hooks/${script}"`, timeout: 10 }] };
    if (matcher) group.matcher = matcher;
    settings.hooks[event].push(group);
  };
  ensure('SessionStart', 'startup|resume|clear|compact', 'session-start.mjs');
  ensure('UserPromptSubmit', null, 'prompt-state.mjs');
  writeJson(settingsPath, settings);
  return ['.keelson/hooks/session-start.mjs', '.keelson/hooks/prompt-state.mjs', '.claude/settings.json'];
}

export function removeHooks(root) {
  const settingsPath = path.join(root, '.claude', 'settings.json');
  const settings = readJson(settingsPath, null);
  if (!settings?.hooks) return;
  for (const ev of Object.keys(settings.hooks)) {
    settings.hooks[ev] = settings.hooks[ev].filter((g) => !(g.hooks ?? []).some((h) => String(h.command ?? '').includes(HOOK_MARK)));
    if (!settings.hooks[ev].length) delete settings.hooks[ev];
  }
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
  writeJson(settingsPath, settings);
}

function removeTargetSurfaces(root, p, keep = new Set()) {
  const removed = [];
  const skillRel = path.join(p.skillsDir, 'keelson');
  const skill = path.join(root, skillRel);
  if (!keep.has(skillRel) && exists(skill)) {
    rmrf(skill);
    removed.push(path.relative(root, skill));
  }
  const insRel = p.instructions;
  const ins = path.join(root, insRel);
  if (!keep.has(insRel) && exists(ins)) {
    if (p.instructionsFormat === 'kiro') rmrf(ins);
    else write(ins, removeBlock(read(ins)));
    removed.push(path.relative(root, ins));
  }
  if (p.rulesFile && !keep.has(p.rulesFile) && exists(path.join(root, p.rulesFile))) {
    rmrf(path.join(root, p.rulesFile));
    removed.push(p.rulesFile);
  }
  if (p.hooks && !keep.has('.claude/settings.json')) removeHooks(root);
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
    const hooksDir = path.join(root, '.keelson', 'hooks');
    if (exists(hooksDir)) {
      rmrf(hooksDir);
      removed.push(path.relative(root, hooksDir));
    }
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
