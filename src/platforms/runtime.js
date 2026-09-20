import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { exists, read, walk, write, rmrf, replaceDirSafe, withLock } from '../lib/fs.js';
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
    ? '# Keelson\n\n这是发现入口，不是技能真源。请立即运行 `keelson guide` 并按其执行；需要更深指导时运行 `keelson guide <reference>`。只有项目需要提交审计副本时才使用 `keelson init --vendor`。\n'
    : '# Keelson\n\nThis is a discovery shim, not the source of truth. Run `keelson guide` now and follow it; for a routed topic run `keelson guide <reference>`. Use `keelson init --vendor` only when this project needs a checked-in copy of the guidance.\n';
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

function normalize(text) {
  return String(text).replace(/\r\n?/g, '\n');
}

const LEGACY_V03_SKILL_HASHES = new Map(`SKILL.md 6c1d26976fdc0c0ddf714f20ee0150ddd4f5a90f86aa9e484f4492de8d8bb12e
references/build.md c377ac5951cef8e64cead62d34cfa517200e1d0ba15afa793e33492ca41f466b
references/context.md e671afb8dbdb29ee246585db00c0eed79a8dbff7a7b1f7b571a3eae580b63095
references/debug.md 7255e959677b0b4a5e0d2b069920e5e21bb541009d0215559c07901c180fdafd
references/design-lenses.md fd4f2f98433411426534a28d8dde809e63203cce106c6f834a64e9fbb6848576
references/discover.md e5254a3e45f06e6660398652bb4ebcb7d7dc1d4b13fffc7d19333828f1dec027
references/engineer.md 5446edf1abdc5f611a60891e3e99c8a5630b3a7364cb1aa239dadb681beaf17b
references/handoff.md 3e733f1b643371fbfb38f19bf882de8a908e35b4701e32f80a5e22c766c34656
references/harness.md 41f9f68abcba57256e14036e2b5fce1dc320b69cfc29a183cd9db514cb25fe84
references/interview.md 754d328582ece5638eedf00f7598e5c7ea9436461ae763d98d062a63f97ba765
references/land.md 185af35388ce7768e1f9d8972777473abb24f8b5ec91d06c4236408ecafa186f
references/model.md 23f8414ff2b04e08660d94f72003f85b006547d87c19140746d58015071a9a93
references/plan.md 92fc655e6381d195a4a3fe803a98f1c3b7f5691a92370c1c91902326f0896565
references/reconcile.md f10681dce0a99e4b775ab50dfa0025639f9f718ce80ab2514f89b3aa990ae19c
references/shape.md 15ad8313300a9abb30d648c52544c6a089cf7293aa55fb12a7e964e6d74a18ad
references/verify.md 03293659d21e64cd30abe93be81a154d5be04fed820e683783170267b0c4147b`.split('\n').map((line) => line.split(' ')));

function fileHash(text) {
  return crypto.createHash('sha256').update(normalize(text)).digest('hex');
}

function canonicalSkillMatches(root, { lang, profile, version }) {
  const dest = path.join(root, CANONICAL_SKILL_DIR);
  const files = renderSkillFiles(lang, profile, version);
  if (JSON.stringify(walk(dest)) === JSON.stringify(files.map((file) => file.rel).sort()) &&
    files.every((file) => exists(path.join(dest, file.rel)) && normalize(read(path.join(dest, file.rel))) === file.content)) return true;
  return lang === 'en' && profile === 'lean' && version === '0.3.0' &&
    JSON.stringify(walk(dest)) === JSON.stringify([...LEGACY_V03_SKILL_HASHES.keys()].sort()) &&
    [...LEGACY_V03_SKILL_HASHES].every(([rel, expected]) => fileHash(read(path.join(dest, rel))) === expected);
}

export function installCanonicalSkill(root, { lang, profile, version, force = false }) {
  const dest = path.join(root, CANONICAL_SKILL_DIR);
  const files = renderSkillFiles(lang, profile, version);
  if (exists(dest) && !canonicalSkillMatches(root, { lang, profile, version }) && !force) {
    throw new Error('vendored skill differs from this CLI output; Keelson left it unchanged. Review it, then pass --force only if replacing the whole directory is intended.');
  }
  withLock(dest, () => {
    replaceDirSafe(dest, (tmp) => {
      for (const f of files) write(path.join(tmp, f.rel), f.content);
    });
  });
  return path.relative(root, dest);
}

export function installSkill(root, target, { lang, version, force = false }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  const content = renderSkillShim(lang, version);
  if (exists(dest) && (!exists(path.join(dest, 'SKILL.md')) || walk(dest).length !== 1 || normalize(read(path.join(dest, 'SKILL.md'))) !== content) && !force) {
    throw new Error('discovery shim differs from this CLI output; Keelson left it unchanged. Review it, then pass --force only if replacing the whole directory is intended.');
  }
  withLock(dest, () => replaceDirSafe(dest, (tmp) => write(path.join(tmp, 'SKILL.md'), content)));
  return path.relative(root, dest);
}

export function workflowContent(lang, guide = false) {
  const file = path.join(skillSource(lang), 'templates', 'workflow.md');
  let text = read(file).replace(/\r\n?/g, '\n');
  if (!guide) return text;
  const line = lang === 'zh'
    ? '> 引导模式：项目所有者希望边做边学。基础提问仍保持场景化；额外解释已采用的工程概念、约束理由，并在 spec 变更收尾时附一段简短教学说明。'
    : '> Guided mode: the owner wants to learn while building. Keep the same accessible questions; additionally name the engineering ideas behind decisions, explain constraint rationale, and close spec changes with a short teaching note.';
  return text.replace(/^# ([^\n]+)\n/, (m) => `${m}\n${line}\n`);
}

export function plannedWorkflowFile(root, { lang, guide = false }) {
  const target = path.join(root, CANONICAL_WORKFLOW);
  const content = workflowContent(lang, guide);
  const status = !exists(target) ? 'create' : fs.readFileSync(target, 'utf8') === content ? 'unchanged' : 'update';
  return { path: path.relative(root, target), status };
}

export function installWorkflow(root, { lang, guide = false, force = false }) {
  const target = path.join(root, CANONICAL_WORKFLOW);
  const content = workflowContent(lang, guide);
  if (exists(target) && normalize(read(target)) !== content && !force) {
    throw new Error('vendored workflow differs from this CLI output; Keelson left it unchanged. Review it, then pass --force only if replacing it is intended.');
  }
  write(target, content);
  return path.relative(root, target);
}

export function residentBlock(lang) {
  return read(path.join(skillSource(lang), 'templates', 'resident-block.md'));
}

export function removeCanonicalRuntime(root, { lang, profile, version, guide = false } = {}) {
  const removed = [];
  const preserved = [];
  const skill = path.join(root, CANONICAL_SKILL_DIR);
  if (exists(skill)) {
    if (canonicalSkillMatches(root, { lang, profile, version })) {
      rmrf(skill);
      removed.push(CANONICAL_SKILL_DIR);
    } else preserved.push(CANONICAL_SKILL_DIR);
  }
  const workflow = path.join(root, CANONICAL_WORKFLOW);
  if (exists(workflow)) {
    const legacyWorkflow = lang === 'en' && version === '0.3.0' && fileHash(read(workflow)) === '8f8b682ce18a8b9fe6acf16fb528a2a752a4c874db7fc23b3029b7d83ba20dd1';
    if (normalize(read(workflow)) === workflowContent(lang, guide) || legacyWorkflow) {
      rmrf(workflow);
      removed.push(CANONICAL_WORKFLOW);
    } else preserved.push(CANONICAL_WORKFLOW);
  }
  return { removed, preserved };
}
