import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { read, readOr, write, exists, copyDir, rmrf, readJson, writeJson, mkdirp } from '../lib/fs.js';

export const PLATFORMS = {
  claude: { label: 'Claude Code', instructions: 'CLAUDE.md', skillsDir: '.claude/skills', hooks: true },
  codex: { label: 'Codex CLI', instructions: 'AGENTS.md', skillsDir: '.agents/skills', hooks: false },
  cursor: { label: 'Cursor', instructions: 'AGENTS.md', skillsDir: '.agents/skills', rulesFile: '.cursor/rules/keelson.mdc', hooks: false },
  opencode: { label: 'OpenCode', instructions: 'AGENTS.md', skillsDir: '.agents/skills', hooks: false },
  gemini: { label: 'Gemini CLI', instructions: 'GEMINI.md', skillsDir: '.agents/skills', hooks: false },
};

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

export function installSkill(root, platformId, { lang, profile }) {
  const p = PLATFORMS[platformId];
  const src = skillSource(lang);
  const dest = path.join(root, p.skillsDir, 'keelson');
  rmrf(dest);
  copyDir(src, dest, { filter: (f) => !f.includes(`${path.sep}templates`) });
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (f.endsWith('.md')) fs.writeFileSync(f, applyProfile(fs.readFileSync(f, 'utf8'), profile));
    }
  };
  walk(dest);
  return path.relative(root, dest);
}

export function installInstructions(root, platformId, { lang }) {
  const p = PLATFORMS[platformId];
  const blockFile = path.join(skillSource(lang), 'templates', 'resident-block.md');
  const block = read(blockFile);
  const file = path.join(root, p.instructions);
  write(file, upsertBlock(readOr(file, ''), block));
  const touched = [path.relative(root, file)];
  if (p.rulesFile) {
    const rf = path.join(root, p.rulesFile);
    write(rf, `---\ndescription: Keelson project workflow\nalwaysApply: true\n---\n\n${block.replace(START, '').replace(END, '').trim()}\n`);
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

export function removeSurfaces(root, tools) {
  const removed = [];
  for (const id of tools) {
    const p = PLATFORMS[id];
    if (!p) continue;
    const skill = path.join(root, p.skillsDir, 'keelson');
    if (exists(skill)) {
      rmrf(skill);
      removed.push(path.relative(root, skill));
    }
    const ins = path.join(root, p.instructions);
    if (exists(ins)) {
      write(ins, removeBlock(read(ins)));
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
