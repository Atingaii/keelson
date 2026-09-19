import fs from 'node:fs';
import path from 'node:path';

export const exists = (p) => fs.existsSync(p);
export const isDir = (p) => exists(p) && fs.statSync(p).isDirectory();
export const read = (p) => fs.readFileSync(p, 'utf8');
export const readOr = (p, fallback = '') => (exists(p) ? read(p) : fallback);
export const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};
export const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });
export const listDirs = (p) =>
  isDir(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
export const listFiles = (p) =>
  isDir(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isFile()).map((d) => d.name).sort() : [];
export const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });
export const copyDir = (from, to, opts = {}) => fs.cpSync(from, to, { recursive: true, ...opts });

/**
 * Replace a generated directory without deleting the last good copy first.
 * A fixed sibling backup makes an interrupted replacement recoverable on the next run.
 */
export function replaceDirSafe(dest, populate) {
  const tmp = `${dest}.keelson-tmp`;
  const bak = `${dest}.keelson-bak`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (!exists(dest) && exists(bak)) fs.renameSync(bak, dest);
  if (exists(tmp)) rmrf(tmp);
  if (exists(bak) && exists(dest)) rmrf(bak);

  fs.mkdirSync(tmp, { recursive: true });
  try {
    populate(tmp);
    if (exists(dest)) fs.renameSync(dest, bak);
    fs.renameSync(tmp, dest);
    if (exists(bak)) rmrf(bak);
  } catch (error) {
    if (exists(tmp)) rmrf(tmp);
    if (!exists(dest) && exists(bak)) fs.renameSync(bak, dest);
    throw error;
  }
}
export const writeJson = (p, obj) => write(p, JSON.stringify(obj, null, 2) + '\n');
export const readJson = (p, fallback = null) => {
  if (!exists(p)) return fallback;
  try {
    return JSON.parse(read(p));
  } catch {
    return fallback;
  }
};

/** Recursively list files under dir, returning relative posix paths. */
export function walk(dir, { ignore = ['node_modules', '.git'] } = {}) {
  const out = [];
  const visit = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (ignore.includes(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) visit(path.join(d, e.name), r);
      else out.push(r);
    }
  };
  if (isDir(dir)) visit(dir, '');
  return out.sort();
}
