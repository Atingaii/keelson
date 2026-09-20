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

// Captured by running f6ce125's v0.3 CLI for every supported language/profile
// combination. A tree hash commits to both paths and normalized file bytes, so
// adding a neighbor or editing one byte makes this fail closed.
const LEGACY_V03_SKILL_TREE_HASHES = new Map([
  ['en/lean', '07ac8e2cb1010956fb172b72661a29ec3c6552ce19433fc4b1a31d012d65272b'],
  ['en/guided', 'a3a6572d22d88f872eaf0326b0af3c674064cd027abba449715bf64e45201652'],
  ['zh/lean', '08dd2c503b58372ef85c460867c6e5ef116919b1f69a00449f1ef750cd7603a0'],
  ['zh/guided', 'd00636b7408c34cabf097d22d347d1e551f629f126f7c9e156760cb73d7d9506'],
]);
const LEGACY_V03_SKILL_SHIM_HASHES = new Set([
  '68a1924866f8ee5af87d0cd75884d3d1ba5bb3138c4daa2d6bd0f6a7d53cd2ef',
  '4157f6ca8898e6e94a351d1fa63da580c54574049cc4af549834ee4fcb4a237b',
]);
const LEGACY_V03_WORKFLOW_HASHES = new Set([
  '8f8b682ce18a8b9fe6acf16fb528a2a752a4c874db7fc23b3029b7d83ba20dd1',
  'eab1d92c97ca695b34ae2290d6533858da7ab89f912ce31acbb89e979b75945b',
  'd8c89ed738bf8c82e643aea41d1cf30cd48b218035234a60b09a2ba6183ae7a4',
  'a3495a7de442c25aa8e41a3d680cf396c6207d2bdc8566d6d1644aa28bd7f5ba',
]);

function fileHash(text) {
  return crypto.createHash('sha256').update(normalize(text)).digest('hex');
}

function ownedWalk(dir) {
  return walk(dir, { ignore: [] });
}

function hasSymbolicLink(dir) {
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) return true;
      if (entry.isDirectory() && visit(path.join(current, entry.name))) return true;
    }
    return false;
  };
  try { return visit(dir); } catch { return true; }
}

function treeHash(dir) {
  if (hasSymbolicLink(dir)) return null;
  try {
    return crypto.createHash('sha256').update(ownedWalk(dir)
      .map((rel) => `${rel}\0${fileHash(read(path.join(dir, rel)))}\n`).join('')).digest('hex');
  } catch { return null; }
}

function canonicalSkillMatches(root, { lang, profile, version }) {
  const dest = path.join(root, CANONICAL_SKILL_DIR);
  const files = renderSkillFiles(lang, profile, version);
  if (!hasSymbolicLink(dest) && JSON.stringify(ownedWalk(dest)) === JSON.stringify(files.map((file) => file.rel).sort()) &&
    files.every((file) => exists(path.join(dest, file.rel)) && normalize(read(path.join(dest, file.rel))) === file.content)) return true;
  return version === '0.3.0' && treeHash(dest) === LEGACY_V03_SKILL_TREE_HASHES.get(`${lang}/${profile}`);
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

function legacyV03SkillShimMatches(dest, legacyVersion) {
  const skill = path.join(dest, 'SKILL.md');
  return legacyVersion === '0.3.0' && exists(skill) && !hasSymbolicLink(dest) && ownedWalk(dest).length === 1 && LEGACY_V03_SKILL_SHIM_HASHES.has(fileHash(read(skill)));
}

function skillShimMatches(dest, content, legacyVersion) {
  const skill = path.join(dest, 'SKILL.md');
  return exists(skill) && !hasSymbolicLink(dest) && ownedWalk(dest).length === 1 &&
    (normalize(read(skill)) === content || legacyV03SkillShimMatches(dest, legacyVersion));
}

function assertSkillInstallable(root, target, { lang, version, legacyVersion, previousVersion, force }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  const priorOutput = previousVersion && managedSkillShimMatches(root, p, previousVersion);
  if (exists(dest) && !skillShimMatches(dest, renderSkillShim(lang, version), legacyVersion) && !priorOutput && !force) {
    throw new Error('discovery shim differs from this CLI output; Keelson left it unchanged. Review it, then pass --force only if replacing the whole directory is intended.');
  }
}

/** Validate discovery replacements before init changes config or legacy runtime. */
export function assertSkillsInstallable(root, targets, options) {
  const seen = new Set();
  for (const target of targets) {
    const p = typeof target === 'string' ? PLATFORMS[target] : target;
    if (seen.has(p.skillsDir)) continue;
    seen.add(p.skillsDir);
    assertSkillInstallable(root, p, options);
  }
}

/** True only for a complete current shim or the byte-exact v0.3 shim. */
export function managedSkillShimMatches(root, target, version) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  return ['en', 'zh'].some((lang) => skillShimMatches(dest, renderSkillShim(lang, version), version));
}

export function installSkill(root, target, { lang, version, legacyVersion = null, previousVersion = null, force = false }) {
  const p = typeof target === 'string' ? PLATFORMS[target] : target;
  const dest = path.join(root, p.skillsDir, 'keelson');
  const content = renderSkillShim(lang, version);
  assertSkillInstallable(root, p, { lang, version, legacyVersion, previousVersion, force });
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
    const legacyWorkflow = version === '0.3.0' && LEGACY_V03_WORKFLOW_HASHES.has(fileHash(read(workflow)));
    if (normalize(read(workflow)) === workflowContent(lang, guide) || legacyWorkflow) {
      rmrf(workflow);
      removed.push(CANONICAL_WORKFLOW);
    } else preserved.push(CANONICAL_WORKFLOW);
  }
  return { removed, preserved };
}
