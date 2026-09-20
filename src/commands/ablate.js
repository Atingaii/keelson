import path from 'node:path';
import crypto from 'node:crypto';
import { requireProjectRoot, projectPaths, USER_HOME } from '../lib/paths.js';
import { exists, isDir, copyDir, rmrf, readJson, writeJson, mkdirp, walk, read } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { removeSurfaces, PLATFORMS, installTargets, managedTargets } from '../platforms/index.js';
import { ok, warn, heading, info } from '../lib/out.js';

const stashDir = (root) => path.join(USER_HOME, 'ablations', crypto.createHash('sha1').update(root).digest('hex').slice(0, 12));

const hashTree = (dir) => {
  const h = crypto.createHash('sha256');
  for (const f of walk(dir)) h.update(f).update('\0').update(read(path.join(dir, f))).update('\0');
  return h.digest('hex');
};
const hashPath = (p) => (exists(p) ? (isDir(p) ? 'dir:' + hashTree(p) : 'file:' + crypto.createHash('sha256').update(read(p)).digest('hex')) : null);

export async function ablate({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const cfg = loadConfig(p.config);
  const stash = stashDir(root);
  if (exists(path.join(stash, 'manifest.json'))) throw new Error(`an ablation for this project already exists (${stash}); run \`keelson restore\` first`);
  heading(`Ablate Keelson from ${root}`);
  const surfaces = [];
  const recordedTargets = managedTargets(root);
  const surfaceTargets = recordedTargets.length ? recordedTargets : installTargets((cfg.tools ?? []).filter((t) => PLATFORMS[t]), cfg);
  for (const pl of surfaceTargets) {
    surfaces.push(pl.instructions, path.join(pl.skillsDir, 'keelson'));
    if (pl.rulesFile) surfaces.push(pl.rulesFile);
    if (pl.hooks) surfaces.push('.claude/settings.json');
    if (pl.sessionAdapter === 'opencode-plugin') surfaces.push('.opencode/plugins/keelson-session.js');
    if (pl.sessionAdapter === 'codebuddy-hooks') surfaces.push('.codebuddy/settings.json');
  }
  // Canonical runtime, hook scripts, session runtime and project facts are
  // stashed as one directory so ablate/restore is byte-for-byte transactional.
  surfaces.push('.keelson');
  if (flags.dryRun) {
    for (const s of surfaces) if (exists(path.join(root, s))) info(`would stash ${s}`);
    return 0;
  }
  mkdirp(stash);
  const manifest = { root, created: new Date().toISOString(), files: [] };
  for (const s of [...new Set(surfaces)]) {
    const src = path.join(root, s);
    if (!exists(src)) continue;
    const dest = path.join(stash, 'files', s);
    mkdirp(path.dirname(dest));
    copyDir(src, dest);
    manifest.files.push(s);
  }
  manifest.hash = hashTree(path.join(stash, 'files'));
  removeSurfaces(root, cfg.tools ?? [], cfg);
  rmrf(p.keelson);
  // What each managed path looks like right after ablation (null = removed). Restore compares against this.
  manifest.after = Object.fromEntries(manifest.files.map((s) => [s, hashPath(path.join(root, s))]));
  writeJson(path.join(stash, 'manifest.json'), manifest);
  for (const s of manifest.files) ok(`stashed ${s}`);
  info(`recovery transaction: ${stash}`);
  warn('start a fresh agent session for the comparison; `keelson restore` brings everything back byte-for-byte');
  return 0;
}

export async function restore({ flags }, cwd = process.cwd()) {
  const root = path.resolve(flags.dir ?? cwd);
  const stash = stashDir(root);
  const manifest = readJson(path.join(stash, 'manifest.json'));
  if (!manifest) throw new Error(`no ablation found for ${root}`);
  if (hashTree(path.join(stash, 'files')) !== manifest.hash) throw new Error('stash contents changed since ablation; refusing to restore');
  heading(`Restore Keelson to ${root}`);
  for (const s of manifest.files) {
    const dest = path.join(root, s);
    const now = hashPath(dest);
    const expected = manifest.after?.[s] ?? null;
    if (now !== expected && !flags.force) {
      throw new Error(`${s} changed while ablated; refusing to overwrite it. Resolve it by hand or pass --force.`);
    }
  }
  if (flags.dryRun) {
    for (const s of manifest.files) info(`would restore ${s}`);
    return 0;
  }
  for (const s of manifest.files) {
    const dest = path.join(root, s);
    rmrf(dest);
    mkdirp(path.dirname(dest));
    copyDir(path.join(stash, 'files', s), dest);
    ok(`restored ${s}`);
  }
  rmrf(stash);
  return 0;
}
