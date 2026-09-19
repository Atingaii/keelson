import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { rmrf, exists } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { removeSurfaces } from '../platforms/index.js';
import { ok, warn, heading, info } from '../lib/out.js';

/** Remove generated surfaces (skills, resident blocks, hooks). Project facts in .keelson/ stay unless --purge. */
export async function uninstall({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  heading(`Uninstall Keelson surfaces from ${root}`);
  const removed = removeSurfaces(root, cfg.tools ?? []);
  for (const r of removed) ok(`removed ${r}`);
  if (exists(p.hooks)) {
    rmrf(p.hooks);
    ok('removed .keelson/hooks');
  }
  if (exists(p.local)) {
    rmrf(p.local);
    ok('removed .keelson/.local');
  }
  if (flags.purge) {
    rmrf(p.keelson);
    warn('removed .keelson/ entirely (INTENT, NOW, rules, changes). Specs outside .keelson/ are untouched.');
  } else info('kept .keelson/ (INTENT, NOW, ROADMAP, rules, specs, changes). Pass --purge to remove it too.');
  return 0;
}
