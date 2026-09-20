import path from 'node:path';
import { PKG_ROOT, findProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { applyProfile, skillSource, stampVersion, workflowContent } from '../platforms/index.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');

const cleanReference = (value) => String(value ?? '')
  .trim()
  .replace(/\.md$/i, '');

/** Print package guidance without copying it into the project. */
export async function guide({ positional = [], flags = {} }, cwd = process.cwd()) {
  const reference = cleanReference(positional[0]);
  const root = findProjectRoot(cwd);
  const cfg = root ? loadConfig(projectPaths(root).config) : {};
  const lang = flags.lang ?? cfg.lang ?? 'en';
  const profile = flags.profile ?? cfg.profile ?? 'lean';
  const guided = flags.guide === undefined ? Boolean(cfg.guide) : flags.guide !== false && flags.guide !== 'false';
  const rendered = (file, { stamp = false } = {}) => {
    let content = applyProfile(read(file).replace(/\r\n?/g, '\n'), profile);
    if (stamp) content = stampVersion(content, PKG_VERSION);
    return content;
  };
  if (!reference) {
    process.stdout.write(rendered(path.join(skillSource(lang), 'SKILL.md'), { stamp: true }));
    return 0;
  }
  if (reference === 'workflow') {
    process.stdout.write(workflowContent(lang, guided));
    return 0;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(reference)) {
    throw new Error('guide reference must be a simple name, for example `keelson guide build`');
  }
  const file = path.join(skillSource(lang), 'references', `${reference}.md`);
  if (!exists(file)) {
    const fallback = path.join(PKG_ROOT, 'skills', 'keelson', 'references', `${reference}.md`);
    if (!exists(fallback)) throw new Error(`unknown guidance reference "${reference}". Run \`keelson guide\` for the index.`);
    process.stdout.write(rendered(fallback));
    return 0;
  }
  process.stdout.write(rendered(file));
  return 0;
}
