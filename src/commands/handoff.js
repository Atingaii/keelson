import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, read, write } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { loadChange, loadAllChanges } from '../lib/changes.js';
import { parseFrontmatter } from '../lib/markdown.js';
import { headSha, gitUserName } from '../lib/git.js';
import { skillSource } from '../platforms/index.js';
import { ok, info } from '../lib/out.js';

/** Create or re-stamp handoff.md for a change. The agent writes the content; the CLI keeps `at`, `updated`, `by` truthful. */
export async function handoff({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  let name = positional[0];
  if (!name) {
    const all = loadAllChanges(p.changes);
    if (all.length === 1) name = all[0].name;
    else throw new Error(all.length ? `several active changes (${all.map((c) => c.name).join(', ')}); name one` : 'no active change');
  }
  const c = loadChange(p.changes, name);
  if (!c) throw new Error(`no change named "${name}"`);
  const file = path.join(c.dir, 'handoff.md');
  const front = `---\nat: ${headSha(root) ?? 'no-git'}\nupdated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}\nby: ${flags.by ?? gitUserName(root)}\n---\n`;
  if (exists(file)) {
    const cur = parseFrontmatter(read(file)).body;
    write(file, front + cur);
    ok(`re-stamped ${path.relative(root, file)} (fill in what changed since the last handoff)`);
  } else {
    const tpl = parseFrontmatter(read(path.join(skillSource(cfg.lang), 'templates', 'handoff.md'))).body.replace(/\{\{name\}\}/g, name);
    write(file, front + tpl);
    ok(`created ${path.relative(root, file)}`);
  }
  info('a handoff is a current-state summary, not a diary: goal and confirmed decisions, done, open/blocked, ruled out, next step, verification');
  if (flags.json) console.log(JSON.stringify({ name, file }));
  return 0;
}
