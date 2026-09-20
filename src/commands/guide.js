import path from 'node:path';
import { PKG_ROOT } from '../lib/paths.js';
import { exists, read } from '../lib/fs.js';
import { skillSource, workflowContent } from '../platforms/index.js';

const cleanReference = (value) => String(value ?? '')
  .trim()
  .replace(/\.md$/i, '');

/** Print package guidance without copying it into the project. */
export async function guide({ positional = [], flags = {} }) {
  const reference = cleanReference(positional[0]);
  const lang = flags.lang === 'zh' ? 'zh' : 'en';
  if (!reference) {
    process.stdout.write(read(path.join(skillSource(lang), 'SKILL.md')));
    return 0;
  }
  if (reference === 'workflow') {
    process.stdout.write(workflowContent(lang, flags.guide === true));
    return 0;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(reference)) {
    throw new Error('guide reference must be a simple name, for example `keelson guide build`');
  }
  const file = path.join(skillSource(lang), 'references', `${reference}.md`);
  if (!exists(file)) {
    const fallback = path.join(PKG_ROOT, 'skills', 'keelson', 'references', `${reference}.md`);
    if (!exists(fallback)) throw new Error(`unknown guidance reference "${reference}". Run \`keelson guide\` for the index.`);
    process.stdout.write(read(fallback));
    return 0;
  }
  process.stdout.write(read(file));
  return 0;
}
