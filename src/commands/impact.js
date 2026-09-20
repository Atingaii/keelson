import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, listDirs } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { matchRules } from '../lib/rules.js';
import { importers } from '../lib/git.js';
import { loadAllChanges } from '../lib/changes.js';
import { list } from '../lib/args.js';
import { heading, dim, warn } from '../lib/out.js';
import { readCapabilitySpec } from '../lib/specs.js';

/** Mechanical impact hints for a set of files. Navigation, never proof of completeness. */
export function impactOf(root, cfg, files) {
  const p = projectPaths(root, cfg);
  const rel = files.map((f) => path.relative(root, path.resolve(root, f)).replace(/\\/g, '/'));
  const callers = importers(root, rel);
  const words = [...new Set(rel.flatMap((f) => path.basename(f).replace(/\.[^.]+$/, '').split(/[-_.]/)).filter((w) => w.length > 2))];
  const specs = [];
  for (const cap of listDirs(p.specs)) {
    const f = path.join(p.specs, cap, 'spec.md');
    if (!exists(f)) continue;
    const txt = readCapabilitySpec(p.specs, cap).toLowerCase();
    const hit = words.filter((w) => txt.includes(w.toLowerCase()));
    if (hit.length || rel.some((r) => r.toLowerCase().includes(cap.toLowerCase()))) specs.push({ capability: cap, matched: hit });
  }
  const rules = matchRules(p.rules, rel).map((r) => ({ file: r.file, globs: r.globs }));
  const changes = loadAllChanges(p.changes).filter((c) => c.touches.some((t) => rel.some((r) => r.startsWith(t.replace(/\/?\*\*$/, '')))) || c.capabilities.some((cap) => specs.some((s) => s.capability === cap)));
  return { files: rel, callers, specs, rules, activeChanges: changes.map((c) => ({ name: c.name, owner: c.owner, work: c.work })) };
}

export async function impact({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const files = [...list(flags.paths), ...positional];
  if (!files.length) throw new Error('usage: keelson impact <file> [file...]');
  const r = impactOf(root, cfg, files);
  if (flags.json) {
    console.log(JSON.stringify(r, null, 2));
    return 0;
  }
  heading(`Impact hints for ${r.files.join(', ')}`);
  console.log(dim('Mechanical hints only: importers by name, specs and rules by path and words. They do not prove the impact list is complete.'));
  console.log('');
  console.log(`Callers / importers (${r.callers.length}):`);
  for (const c of r.callers) console.log(`  ${c}`);
  if (!r.callers.length) console.log(dim('  none found by import name — check dynamic entry points by hand'));
  console.log(`Specs that may be affected (${r.specs.length}):`);
  for (const s of r.specs) console.log(`  ${s.capability}${s.matched.length ? dim(` (mentions ${s.matched.join(', ')})`) : ''}`);
  console.log(`Rules that apply (${r.rules.length}):`);
  for (const ru of r.rules) console.log(`  rules/${ru.file}  ${dim(ru.globs.join(', '))}`);
  if (r.activeChanges.length) {
    console.log('');
    for (const c of r.activeChanges) warn(`active change ${c.name} (${c.owner ?? 'unowned'}, ${c.work}) declares these paths or capabilities — coordinate before editing`);
  }
  console.log('');
  console.log(dim('Still to check by reading: other entry points (CLI, jobs, API routes), data constraints, permission rules, compatibility promises.'));
  return 0;
}
