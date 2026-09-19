import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { exists, read, write, rmrf, replaceDirSafe } from '../lib/fs.js';
import { PLATFORMS } from './registry.js';

export const CANONICAL_SKILL_DIR = path.join('.keelson', 'skill');
export const CANONICAL_WORKFLOW = path.join('.keelson', 'workflow.md');

export function skillSource(lang) {
  const dir = lang === 'zh' ? path.join(PKG_ROOT, 'skills', 'zh', 'keelson') : path.join(PKG_ROOT, 'skills', 'keelson');
  return exists(dir) ? dir : path.join(PKG_ROOT, 'skills', 'keelson');
}

/** Strip guided-only blocks from the lean profile. */
export function applyProfile(text, profile) {
  if (profile === 'guided') return text.replace(/<!-- \/?guided -->\n?/g, '');
  return text.replace(/<!-- guided -->[\s\S]*?<!-- \/guided -->\n?/g, '');
}

/** Stamp package version into SKILL.md frontmatter and normalize package-owned Markdown to LF. */
export function stampVersion(text, version) {
  text = text.replace(/\r\n?/g, '\n');
  if (!version) return text;
  if (/^version:\s*/m.test(text.split('\n---')[0] ?? '')) return text.replace(/^version:.*$/m, `version: ${version}`);
  return text.replace(/^---\n([\s\S]*?)\n---/, (_, fm) => `---\n${fm}\nversion: ${version}\n---`);
}

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
  return read(path.join(skillSource(lang), 'templates', 'resident-block.md'));
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
