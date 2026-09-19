import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { read, readOr, write, exists, copyDir, rmrf, readJson, writeJson, mkdirp } from '../lib/fs.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/** Platform registry: where each tool reads instructions and skills. Overridable per project via config.yaml → platforms.<id>. */
const REGISTRY = require('../../registry/platforms.json');
export const PLATFORMS = Object.fromEntries(Object.entries(REGISTRY.platforms).map(([id, p]) => [id, { id, ...p }]));
export const PLATFORM_IDS = Object.keys(PLATFORMS);

/** Merge per-project overrides (config.yaml → platforms) on top of the registry. */
export function platformFor(id, cfg = null) {
  const base = PLATFORMS[id];
  if (!base) return null;
  const over = cfg?.platforms?.[id];
  return over && typeof over === 'object' ? { ...base, ...over } : base;
}

/** The cross-tool layer every non-Claude selection also gets: AGENTS.md + .agents/skills. */
export const CROSS_TOOL = { id: 'agents', label: 'cross-tool layer', instructions: 'AGENTS.md', skillsDir: '.agents/skills', hooks: false };

/** Expand a tool selection into the concrete targets to install: dedupe by path, add the cross-tool layer where it applies. */
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
    push(p);
    if (id !== 'claude') push(CROSS_TOOL);
  }
  return targets;
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
        if (r.endsWith('.md')) content = applyProfile(content, profile);
        if (r === 'SKILL.md') content = stampVersion(content, version);
        out.push({ rel: r, content });
      }
    }
  };
  visit(src, '');
  return out;
}

export function plannedSkillFiles(root, target, { lang, profile, version }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  return renderSkillFiles(lang, profile, version).map((f) => {
    const target = path.join(dest, f.rel);
    const status = !exists(target) ? 'create' : fs.readFileSync(target, 'utf8') === f.content ? 'unchanged' : 'update';
    return { path: path.relative(root, target), status };
  });
}

export function installSkill(root, target, { lang, profile, version }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  rmrf(dest);
  for (const f of renderSkillFiles(lang, profile, version)) write(path.join(dest, f.rel), f.content);
  return path.relative(root, dest);
}

export function residentBlock(lang, guide = false) {
  const blockFile = path.join(skillSource(lang), 'templates', 'resident-block.md');
  let block = read(blockFile);
  const guideLine = lang === 'zh'
    ? '- 引导模式已开启：项目所有者正在学习工程实践。用具体场景提问、给推荐和取舍、解释术语；spec 变更落地后附一段简短的教学说明。'
    : '- Guided mode is on: the owner is learning engineering. Ask with concrete scenarios, recommend with trade-offs, explain terms, and close spec changes with a short teaching note.';
  return guide ? block.replace(END, `${guideLine}\n${END}`) : block;
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

export function removeSurfaces(root, tools, cfg = null) {
  const removed = [];
  for (const p of installTargets(tools.filter((t) => PLATFORMS[t]), cfg)) {
    const skill = path.join(root, p.skillsDir, 'keelson');
    if (exists(skill)) {
      rmrf(skill);
      removed.push(path.relative(root, skill));
    }
    const ins = path.join(root, p.instructions);
    if (exists(ins)) {
      if (p.instructionsFormat === 'kiro') rmrf(ins);
      else write(ins, removeBlock(read(ins)));
      removed.push(path.relative(root, ins));
    }
    if (p.rulesFile && exists(path.join(root, p.rulesFile))) {
      rmrf(path.join(root, p.rulesFile));
      removed.push(p.rulesFile);
    }
  }
  removeHooks(root);
  return removed;
}
