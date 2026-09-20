import fs from 'node:fs';
import path from 'node:path';
import { PKG_ROOT, findProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { applyProfile, skillSource, stampVersion, workflowContent } from '../platforms/index.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');
const cleanReference = (value) => String(value ?? '').trim().replace(/\.md$/i, '');

export function guidanceOptions(flags, cwd) {
  const root = findProjectRoot(cwd);
  const cfg = root ? loadConfig(projectPaths(root).config) : {};
  const lang = flags.lang ?? cfg.lang ?? 'en';
  if (!['en', 'zh'].includes(lang)) throw new Error('guidance language must be en or zh');
  return {
    lang,
    profile: flags.profile ?? cfg.profile ?? 'lean',
    guided: flags.guide === undefined ? Boolean(cfg.guide) : flags.guide !== false && flags.guide !== 'false',
  };
}

export function readGuidance(value, { lang, profile, guided }) {
  const reference = cleanReference(value);
  const rendered = (file) => applyProfile(read(file).replace(/\r\n?/g, '\n'), profile);
  if (!reference) return stampVersion(rendered(path.join(skillSource(lang), 'SKILL.md')), PKG_VERSION);
  if (reference === 'workflow') return workflowContent(lang, guided);
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(reference)) {
    throw new Error('guide reference must be a simple name, for example `keelson guide build`');
  }
  const file = path.join(skillSource(lang), 'references', `${reference}.md`);
  const fallback = path.join(PKG_ROOT, 'skills', 'keelson', 'references', `${reference}.md`);
  if (!exists(file) && !exists(fallback)) throw new Error(`unknown guidance reference "${reference}". Run \`keelson guide --list\` for the index.`);
  return rendered(exists(file) ? file : fallback);
}

/** Print package guidance without copying it into the project. */
export async function guide({ positional = [], flags = {} }, cwd = process.cwd()) {
  const options = guidanceOptions(flags, cwd);
  if (flags.list) {
    if (positional.length) throw new Error('use `keelson guide --list` or `keelson guide <reference>`, not both');
    const directories = [path.join(PKG_ROOT, 'skills', 'keelson', 'references'), path.join(skillSource(options.lang), 'references')];
    const names = [...new Set(directories.flatMap((dir) => fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map(cleanReference)))].sort();
    const references = ['workflow', ...names].map((name) => ({ name, title: readGuidance(name, options).match(/^#\s+(.+)$/m)?.[1] ?? name }));
    if (flags.json) console.log(JSON.stringify({ lang: options.lang, references }, null, 2));
    else console.log([
      options.lang === 'zh' ? '按需指导' : 'Installed guidance', '',
      ...references.map(({ name, title }) => `  ${name.padEnd(24)} ${title}`), '',
      'keelson guide <reference>',
    ].join('\n'));
    return 0;
  }
  if (positional.length > 1) throw new Error('guide accepts one reference; run `keelson guide --list`');
  if (flags.json) throw new Error('use `keelson guide --list --json` for a machine-readable index');
  process.stdout.write(readGuidance(positional[0], options));
  return 0;
}
