import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const exists = (p) => fs.existsSync(p);
export const isDir = (p) => exists(p) && fs.statSync(p).isDirectory();
export const read = (p) => fs.readFileSync(p, 'utf8');
export const readOr = (p, fallback = '') => (exists(p) ? read(p) : fallback);
export const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    const mode = exists(p) ? fs.statSync(p).mode & 0o777 : 0o600;
    const fd = fs.openSync(tmp, 'wx', mode);
    try { fs.writeFileSync(fd, s); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    const deadline = Date.now() + 1000;
    for (;;) {
      try { fs.renameSync(tmp, p); break; }
      catch (error) {
        // Windows can briefly deny replacement while another process has the
        // destination open. Keep the old file intact and retry the same atomic
        // rename; never emulate replacement by unlinking the destination.
        if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || Date.now() >= deadline) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
    }
  } finally { fs.rmSync(tmp, { force: true }); }
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
export const readJson = (p, fallback = null, { strict = true } = {}) => {
  if (!exists(p)) return fallback;
  try {
    return JSON.parse(read(p));
  } catch (cause) {
    if (strict) throw Object.assign(new Error(`cannot parse ${p}: ${cause.message}. Repair the file; it has not been overwritten.`), { exitCode: 5 });
    return fallback;
  }
};

/** Serialize a synchronous read/modify/write. A dead process lock is never guessed stale. */
export function withLock(file, fn, { timeout = 10000 } = {}) {
  const lock = `${file}.lock`;
  mkdirp(path.dirname(lock));
  const start = Date.now();
  let fd;
  for (;;) {
    try { fd = fs.openSync(lock, 'wx', 0o600); break; }
    catch (error) {
      // A Windows lock file being closed/deleted may report a sharing error
      // instead of EEXIST. Wait within the same bound; never remove its lock.
      if (error.code !== 'EEXIST' && !(process.platform === 'win32' && ['EPERM', 'EACCES', 'EBUSY'].includes(error.code))) throw error;
      if (Date.now() - start >= timeout) throw new Error(`lock timeout: ${lock}. Check for an active writer before removing an abandoned lock.`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try { fs.writeFileSync(fd, `${process.pid}\n`); return fn(); }
  finally {
    fs.closeSync(fd);
    const deadline = Date.now() + 1000;
    for (;;) {
      try { fs.unlinkSync(lock); break; }
      catch (error) {
        if (error.code === 'ENOENT') break;
        // A competing Windows opener can briefly deny deletion too. Retry
        // only removal of our acquired lock, never the completed callback.
        if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || Date.now() >= deadline) throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
      }
    }
  }
}

export function append(file, text) {
  return withLock(file, () => {
    const fd = fs.openSync(file, 'a', 0o600);
    try { fs.writeFileSync(fd, text); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  });
}

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
