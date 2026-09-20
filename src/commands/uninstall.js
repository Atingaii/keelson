import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { rmrf, exists } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { readManagedState, removeCanonicalRuntime, removeSurfaces } from '../platforms/index.js';
import { ok, warn, heading, info } from '../lib/out.js';

/** Remove generated surfaces (skills, resident blocks, hooks). Project facts in .keelson/ stay unless --purge. */
export async function uninstall({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const managed = readManagedState(root);
  heading(`Uninstall Keelson surfaces from ${root}`);
  const removed = removeSurfaces(root, cfg.tools ?? [], cfg);
  for (const r of removed) ok(`removed ${r}`);
  if (managed?.vendor === true) {
    const canonical = removeCanonicalRuntime(root, { lang: cfg.lang, profile: cfg.profile, version: managed.packageVersion, guide: cfg.guide });
    for (const r of canonical.removed) ok(`removed ${r}`);
    for (const r of canonical.preserved) warn(`kept ${r}: it differs from the vendored Keelson output`);
  }
  if (exists(p.runtime)) {
    rmrf(p.runtime);
    ok('removed Keelson local runtime');
  }
  if (flags.purge) {
    rmrf(p.keelson);
    warn('removed .keelson/ entirely (INTENT, NOW, rules, changes). Specs outside .keelson/ are untouched.');
  } else info('kept .keelson/ project facts (INTENT, NOW, ROADMAP, rules, specs, changes). Pass --purge to remove everything.');
  return 0;
}
