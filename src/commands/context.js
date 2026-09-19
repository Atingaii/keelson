import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { readOr, listDirs } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { matchRules } from '../lib/rules.js';
import { loadAllChanges } from '../lib/changes.js';
import { gitStatusShort, recentCommits } from '../lib/git.js';
import { list } from '../lib/args.js';

export async function context({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const cfg = loadConfig(p.config);
  const paths = [...list(flags.paths), ...positional].map((x) => path.relative(root, path.resolve(root, x)).replace(/\\/g, '/'));
  const rules = matchRules(p.rules, paths.length ? paths : []);
  const changes = loadAllChanges(p.changes);
  const specs = listDirs(p.specs);
  const data = {
    root,
    intent: readOr(p.intent).trim(),
    now: readOr(p.now).trim(),
    context: cfg.context?.trim() ?? '',
    paths,
    rules: rules.map((r) => ({ file: `.keelson/rules/${r.file}`, globs: r.globs, content: r.content.trim(), missing: !r.exists })),
    specs,
    changes: changes.map((c) => ({ name: c.name, tier: c.tier, phase: c.phase, progress: c.progress })),
    git: { dirty: gitStatusShort(root), recent: recentCommits(root, 5) },
  };
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }
  const out = [];
  out.push(`# Keelson context — ${path.basename(root)}`, '');
  if (data.context) out.push('## Project context (config.yaml)', '', data.context, '');
  out.push('## INTENT.md', '', data.intent || '(empty — fill in .keelson/INTENT.md)', '');
  out.push('## NOW.md', '', data.now || '(empty)', '');
  out.push('## Active changes', '', ...(changes.length ? changes.map((c) => `- ${c.name} · ${c.tier} · ${c.phase} · ${c.progress.done}/${c.progress.total} tasks`) : ['none']), '');
  out.push('## Capabilities with specs', '', specs.length ? specs.map((s) => `- ${s} → .keelson/specs/${s}/spec.md`).join('\n') : 'none yet', '');
  out.push(`## Rules matched${paths.length ? ` for ${paths.join(', ')}` : ' (always-on only; pass --paths to route)'}`, '');
  if (!rules.length) out.push('none');
  for (const r of rules) {
    out.push(`### .keelson/rules/${r.file}  (${r.globs.join(', ')})`, '');
    out.push(r.exists ? r.content.trim() : '(file missing — referenced in index.md but not found)', '');
  }
  if (data.git.dirty?.length) out.push('## Uncommitted', '', ...data.git.dirty.slice(0, 20).map((l) => `- ${l}`), '');
  console.log(out.join('\n'));
  return 0;
}
