import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { read, readOr, write, exists, copyDir, rmrf, readJson, writeJson, mkdirp, replaceDirSafe } from '../lib/fs.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** Platform registry: where each tool reads instructions and skills. Overridable per project via config.yaml → platforms.<id>. */
const REGISTRY = require('../../registry/platforms.json');
export const PLATFORMS = Object.fromEntries(Object.entries(REGISTRY.platforms).map(([id, p]) => [id, { id, ...p }]));
export const PLATFORM_IDS = Object.keys(PLATFORMS);
export const RETIRED_PLATFORM_IDS = ['cursor', 'copilot', 'kilo', 'antigravity', 'devin', 'qoder', 'droid', 'ohmypi', 'reasonix', 'zcode', 'trae', 'grok', 'kimi', 'snow'];

/** Merge per-project overrides (config.yaml → platforms) on top of the registry. */
export function platformFor(id, cfg = null) {
  const base = PLATFORMS[id];
  if (!base) return null;
  const over = cfg?.platforms?.[id];
  return over && typeof over === 'object' ? { ...base, ...over } : base;
}

/** Portable cross-tool layer installed for every project: AGENTS.md + .agents/skills. */
export const CROSS_TOOL = { id: 'agents', label: 'cross-tool layer', instructions: 'AGENTS.md', skillsDir: '.agents/skills', hooks: false };
export const CANONICAL_SKILL_DIR = path.join('.keelson', 'skill');
export const CANONICAL_WORKFLOW = path.join('.keelson', 'workflow.md');
export const MANAGED_STATE = path.join('.keelson', '.managed.json');

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

/** Expand a tool selection into concrete targets. Every project also gets the portable cross-tool layer. */
export function installTargets(tools, cfg = null) {
  const targets = [];
  const seen = new Set();
  const push = (t) => {
    const key = `${t.instructions}|${t.skillsDir}|${t.rulesFile ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(t);
  };
  for (const id of tools) {
    const p = platformFor(id, cfg);
    if (!p) throw new Error(`unknown tool "${id}". Known: ${PLATFORM_IDS.join(', ')}`);
    push({ ...p, hooks: Boolean(p.hooks && cfg?.hooks !== false) });
  }
  push(CROSS_TOOL);
  return targets;
}


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

export function readManagedState(root) {
  return readJson(path.join(root, MANAGED_STATE), null);
}

export function managedTargets(root) {
  const state = readManagedState(root);
  return Array.isArray(state?.targets) ? state.targets : [];
}

export function managedStateMatches(root, targets) {
  const state = readManagedState(root);
  if (!state || state.version !== 1) return false;
  const a = JSON.stringify((state.targets ?? []).map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  const b = JSON.stringify(targets.map(managedTarget).sort((x, y) => targetKey(x).localeCompare(targetKey(y))));
  return a === b;
}

export function writeManagedState(root, targets, packageVersion) {
  writeJson(path.join(root, MANAGED_STATE), {
    version: 1,
    packageVersion,
    targets: targets.map(managedTarget),
  });
  return MANAGED_STATE;
}

export function staleManagedTargets(root, targets) {
  const current = new Set(targets.map(targetKey));
  return managedTargets(root).filter((t) => !current.has(targetKey(t)));
}

function managedSurfacePaths(t) {
  return [path.join(t.skillsDir, 'keelson'), t.instructions, t.rulesFile].filter(Boolean);
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

export function skillSource(lang) {
  const dir = lang === 'zh' ? path.join(PKG_ROOT, 'skills', 'zh', 'keelson') : path.join(PKG_ROOT, 'skills', 'keelson');
  return exists(dir) ? dir : path.join(PKG_ROOT, 'skills', 'keelson');
}

/** Strip <!-- guided --> … <!-- /guided --> blocks when profile is lean. */
export function applyProfile(text, profile) {
  if (profile === 'guided') return text.replace(/<!-- \/?guided -->\n?/g, '');
  return text.replace(/<!-- guided -->[\s\S]*?<!-- \/guided -->\n?/g, '');
}

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

/** Stamp the package version into SKILL.md frontmatter so `keelson doctor` can spot a stale install. */
export function stampVersion(text, version) {
  text = text.replace(/\r\n?/g, '\n');
  if (!version) return text;
  if (/^version:\s*/m.test(text.split('\n---')[0] ?? '')) return text.replace(/^version:.*$/m, `version: ${version}`);
  return text.replace(/^---\n([\s\S]*?)\n---/, (_, fm) => `---\n${fm}\nversion: ${version}\n---`);
}

/** The files installSkill would write, with their content, without touching disk. */
export function renderSkillFiles(lang, profile, version) {
  const src = skillSource(lang);
  const out = [];
  const visit = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'templates') continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visit(path.join(d, e.name), r);
      else {
        let content = fs.readFileSync(path.join(d, e.name), 'utf8');
        if (r.endsWith('.md')) content = applyProfile(content.replace(/\r\n?/g, '\n'), profile);
        if (r === 'SKILL.md') content = stampVersion(content, version);
        out.push({ rel: r, content });
      }
    }
  };
  visit(src, '');
  return out;
}

export function renderSkillShim(lang, version) {
  const full = stampVersion(read(path.join(skillSource(lang), 'SKILL.md')).replace(/\r\n?/g, '\n'), version);
  const front = full.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '---\nname: keelson\ndescription: Keelson project skill\n---';
  const body = lang === 'zh'
    ? '# Keelson\n\n这是发现入口，不是技能真源。请立即读取项目根目录下的 `.keelson/skill/SKILL.md` 并按其执行；任务需要更深指导时，只从 `.keelson/skill/references/` 按需加载。不要把完整指导复制回此文件；`keelson update` 会重建这个 shim。\n'
    : '# Keelson\n\nThis is a discovery shim, not the source of truth. Read `.keelson/skill/SKILL.md` from the project root now and follow it; load deeper guidance only from `.keelson/skill/references/` as routed there. Do not copy the full guidance back into this file; `keelson update` regenerates this shim.\n';
  return `${front}\n\n${body}`;
}

export function plannedCanonicalSkillFiles(root, { lang, profile, version }) {
  const dest = path.join(root, CANONICAL_SKILL_DIR);
  return renderSkillFiles(lang, profile, version).map((f) => {
    const target = path.join(dest, f.rel);
    const status = !exists(target) ? 'create' : fs.readFileSync(target, 'utf8') === f.content ? 'unchanged' : 'update';
    return { path: path.relative(root, target), status };
  });
}

export function plannedSkillFiles(root, target, { lang, version }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const targetPath = path.join(root, p.skillsDir, 'keelson', 'SKILL.md');
  const content = renderSkillShim(lang, version);
  const status = !exists(targetPath) ? 'create' : fs.readFileSync(targetPath, 'utf8') === content ? 'unchanged' : 'update';
  return [{ path: path.relative(root, targetPath), status }];
}

export function installCanonicalSkill(root, { lang, profile, version }) {
  const dest = path.join(root, CANONICAL_SKILL_DIR);
  const files = renderSkillFiles(lang, profile, version);
  replaceDirSafe(dest, (tmp) => {
    for (const f of files) write(path.join(tmp, f.rel), f.content);
  });
  return path.relative(root, dest);
}

export function installSkill(root, target, { lang, version }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  const content = renderSkillShim(lang, version);
  replaceDirSafe(dest, (tmp) => write(path.join(tmp, 'SKILL.md'), content));
  return path.relative(root, dest);
}

export function workflowContent(lang, guide = false) {
  const file = path.join(skillSource(lang), 'templates', 'workflow.md');
  let text = read(file).replace(/\r\n?/g, '\n');
  if (!guide) return text;
  const line = lang === 'zh'
    ? '> 引导模式：项目所有者正在学习工程实践。用具体场景提问，给出推荐与取舍，解释术语；spec 变更收尾时附一段简短教学说明。'
    : '> Guided mode: the owner is learning engineering. Ask with concrete scenarios, recommend with trade-offs, explain terms, and close spec changes with a short teaching note.';
  return text.replace(/^# ([^\n]+)\n/, (m) => `${m}\n${line}\n`);
}

export function plannedWorkflowFile(root, { lang, guide = false }) {
  const target = path.join(root, CANONICAL_WORKFLOW);
  const content = workflowContent(lang, guide);
  const status = !exists(target) ? 'create' : fs.readFileSync(target, 'utf8') === content ? 'unchanged' : 'update';
  return { path: path.relative(root, target), status };
}

export function installWorkflow(root, { lang, guide = false }) {
  const target = path.join(root, CANONICAL_WORKFLOW);
  write(target, workflowContent(lang, guide));
  return path.relative(root, target);
}

export function residentBlock(lang) {
  const blockFile = path.join(skillSource(lang), 'templates', 'resident-block.md');
  return read(blockFile);
}

export function removeCanonicalRuntime(root) {
  const removed = [];
  for (const rel of [CANONICAL_SKILL_DIR, CANONICAL_WORKFLOW]) {
    const target = path.join(root, rel);
    if (!exists(target)) continue;
    rmrf(target);
    removed.push(rel);
  }
  return removed;
}

const stripMarkers = (block) => block.replace(START, '').replace(END, '').trim();

/** Write the resident block into a target's instructions file (and its rules file, when the tool has one). */
export function installInstructions(root, target, { lang, guide = false }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const block = residentBlock(lang, guide);
  const touched = [];
  const file = path.join(root, p.instructions);
  if (p.instructionsFormat === 'kiro') {
    // Kiro steering files are standalone Markdown with an inclusion header; we own the whole file.
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
  if (p.hooks && ![...keep].some((rel) => rel === '.claude/settings.json')) removeHooks(root);
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
  if (exists(path.join(root, MANAGED_STATE))) {
    rmrf(path.join(root, MANAGED_STATE));
    removed.push(MANAGED_STATE);
  }
  return [...new Set(removed)];
}
