import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { walk } from './fs.js';

export function git(root, args, { allowFail = true, env = {} } = {}) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } }).trim();
  } catch (e) {
    if (allowFail) return null;
    throw e;
  }
}

function gitBytes(root, args) {
  return execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

export const isGitRepo = (root) => git(root, ['rev-parse', '--is-inside-work-tree']) === 'true';
export const headSha = (root) => git(root, ['rev-parse', '--short=10', 'HEAD']);
export const currentBranch = (root) => git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
export const gitUserName = (root) => git(root, ['config', 'user.name']) || os.userInfo().username;

export function gitStatusShort(root) {
  const s = git(root, ['status', '--porcelain']);
  return s === null ? null : s.split('\n').filter(Boolean);
}

export function recentCommits(root, n = 5) {
  const s = git(root, ['log', `-${n}`, '--pretty=%h %s']);
  return s ? s.split('\n') : [];
}

const KEELSON_DIR = Buffer.from('.keelson');
const LENGTH_BUFFER = Buffer.allocUnsafe(8);

function nulRecords(bytes) {
  const records = [];
  for (let start = 0; start < bytes.length;) {
    const end = bytes.indexOf(0, start);
    if (end === -1) break;
    records.push(bytes.subarray(start, end));
    start = end + 1;
  }
  return records;
}

function isKeelsonPath(file) {
  return file.equals(KEELSON_DIR) || (file.length > KEELSON_DIR.length && file.subarray(0, KEELSON_DIR.length).equals(KEELSON_DIR) && file[KEELSON_DIR.length] === 0x2f);
}

function fingerprintPathResolver(root) {
  const base = path.resolve(root);
  const prefix = base.endsWith(path.sep) ? base : `${base}${path.sep}`;
  const separators = path.sep === '\\' ? /[\\/]/ : /\//;
  return (bytes) => {
    if (!isUtf8(bytes)) throw new Error('cannot fingerprint a Git path that is not valid UTF-8');
    const rel = bytes.toString('utf8');
    // Git emits canonical relative names. Reject any escape component, then
    // concatenate with the already-resolved root without a path.relative call
    // for every entry in a large repository.
    if (!rel || path.isAbsolute(rel) || rel.split(separators).includes('..')) {
      throw new Error('cannot fingerprint a Git path outside the project root');
    }
    return `${prefix}${rel}`;
  };
}

export function resolveFingerprintPath(root, bytes) {
  return fingerprintPathResolver(root)(bytes);
}

function addGitEntries(entries, root, args, kind) {
  const output = gitBytes(root, args);
  for (const record of nulRecords(output)) {
    const tab = kind === 'tracked' ? record.indexOf(0x09) : -1;
    const metadata = tab === -1 ? null : record.subarray(0, tab).toString('ascii').split(' ');
    const rawFile = tab === -1 ? record : record.subarray(tab + 1);
    if (!rawFile.length || isKeelsonPath(rawFile)) continue;
    entries.push({ kind, rawFile, indexMode: metadata ? Number.parseInt(metadata[0], 8) : null });
  }
}

function updateField(hash, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  LENGTH_BUFFER.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(LENGTH_BUFFER).update(bytes);
}

function contentDigest(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function prepareEntry(resolvePath, entry) {
  const file = resolvePath(entry.rawFile);
  if (!file) return null;
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    // A deleted tracked path is absent from the current worktree tree.
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    throw error;
  }
  entry.file = file;
  entry.mode = stat.mode;
  entry.type = stat.isDirectory() ? 'gitlink' : stat.isSymbolicLink() ? 'symlink' : stat.isFile() ? 'file' : 'other';
  return entry;
}

function gitObjectDigests(root, entries) {
  const digests = new Map();
  const batched = [];
  for (const entry of entries) {
    // `--stdin-paths` is newline-delimited. Keep the rare newline names on
    // the direct path so they cannot be split or silently omitted.
    if (entry.file.includes('\n')) {
      digests.set(entry, contentDigest(fs.readFileSync(entry.file)));
    } else {
      batched.push(entry);
    }
  }
  if (!batched.length) return digests;
  const input = Buffer.from(`${batched.map((entry) => entry.file).join('\n')}\n`);
  const output = execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], {
    cwd: root,
    input,
    encoding: 'buffer',
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  const lines = output.subarray(0, output.length && output[output.length - 1] === 0x0a ? -1 : output.length).toString('ascii').split('\n');
  if (lines.length !== batched.length || lines.some((line) => !/^[a-f0-9]{40,64}$/.test(line))) {
    throw new Error('git hash-object returned an invalid digest list');
  }
  for (let index = 0; index < batched.length; index++) {
    // Git reads the current bytes once for this content-addressed blob ID;
    // the outer worktree SHA-256 frames that digest with every path/mode.
    digests.set(batched[index], Buffer.from(lines[index], 'ascii'));
  }
  return digests;
}

function framedValues(values) {
  const fields = values.map((value) => Buffer.isBuffer(value) ? value : Buffer.from(String(value)));
  const total = fields.reduce((sum, field) => sum + 8 + field.length, 0);
  const framed = Buffer.allocUnsafe(total);
  let offset = 0;
  for (const field of fields) {
    framed.writeUInt32BE(0, offset);
    framed.writeUInt32BE(field.length, offset + 4);
    offset += 8;
    field.copy(framed, offset);
    offset += field.length;
  }
  return framed;
}

function framePreparedEntry(entry, digest) {
  if (entry.type === 'gitlink') {
    return framedValues([entry.kind, entry.rawFile, 'gitlink', git(entry.file, ['rev-parse', '--verify', 'HEAD']) ?? 'missing']);
  }
  if (entry.type === 'symlink') {
    return framedValues([entry.kind, entry.rawFile, 'symlink', contentDigest(fs.readlinkSync(entry.file, { encoding: 'buffer' }))]);
  }
  if (entry.type !== 'file') return framedValues([entry.kind, entry.rawFile, 'other', String(entry.mode)]);
  return framedValues([entry.kind, entry.rawFile, 'file', String(entry.mode & 0o111), digest]);
}

function hashGitEntries(hash, root, entries) {
  const resolvePath = fingerprintPathResolver(root);
  const prepared = entries.map((entry) => prepareEntry(resolvePath, entry)).filter(Boolean);
  const regular = prepared.filter((entry) => entry.type === 'file');
  const digests = gitObjectDigests(root, regular);
  let pending = [];
  let pendingBytes = 0;
  for (const entry of prepared) {
    const framed = framePreparedEntry(entry, digests.get(entry));
    pending.push(framed);
    pendingBytes += framed.length;
    if (pendingBytes >= 512 * 1024) {
      hash.update(Buffer.concat(pending, pendingBytes));
      pending = [];
      pendingBytes = 0;
    }
  }
  if (pendingBytes) hash.update(Buffer.concat(pending, pendingBytes));
}

/**
 * Fingerprint current inputs with `.keelson/` excluded, so a ledger append
 * does not invalidate its own evidence. Git supplies the tracked and
 * non-ignored path set; every included entry is freshly content-addressed on
 * every call (regular files through Git's native reader). This deliberately
 * avoids stat or filename caches, including same-mtime edits.
 *
 * Git fingerprints are SHA-256 rather than Git tree IDs. Existing 40-byte
 * Git-tree records therefore become stale and must be re-recorded.
 */
function gitFingerprintEntries(root) {
  const entries = [];
  try {
    addGitEntries(entries, root, ['ls-files', '-s', '-z'], 'tracked');
    addGitEntries(entries, root, ['ls-files', '--others', '--exclude-standard', '-z'], 'untracked');
  } catch (error) {
    // Do not pay for rev-parse in normal Git projects. The legacy fallback
    // remains for ordinary non-Git directories; an error inside a repository
    // still propagates rather than silently omitting inputs.
    if (error?.status === 128 && !isGitRepo(root)) return null;
    throw error;
  }
  entries.sort((a, b) => Buffer.compare(a.rawFile, b.rawFile) || a.kind.localeCompare(b.kind));
  return entries;
}

export function worktreeFingerprint(root) {
  const entries = gitFingerprintEntries(root);
  if (entries) {
    const hash = crypto.createHash('sha256').update('keelson-worktree-v2\0');
    hashGitEntries(hash, root, entries);
    return hash.digest('hex');
  }
  const h = crypto.createHash('sha256').update('keelson-worktree-v2\0');
  for (const f of walk(root, { ignore: ['node_modules', '.git', '.keelson'] })) {
    const full = path.join(root, f);
    const stat = fs.lstatSync(full);
    updateField(h, 'non-git');
    updateField(h, f);
    if (stat.isSymbolicLink()) {
      updateField(h, 'symlink');
      updateField(h, contentDigest(fs.readlinkSync(full, { encoding: 'buffer' })));
    } else {
      updateField(h, 'file');
      updateField(h, String(stat.mode & 0o111));
      updateField(h, contentDigest(fs.readFileSync(full)));
    }
  }
  return h.digest('hex');
}

export const lastTag = (root) => git(root, ['describe', '--tags', '--abbrev=0']);

/** Names of change directories deleted (folded) since a ref, from git history. */
export function foldedSince(root, ref) {
  if (!isGitRepo(root) || !ref) return [];
  const log = git(root, ['log', `${ref}..HEAD`, '--diff-filter=D', '--name-only', '--pretty=format:', '--', '.keelson/changes']);
  if (!log) return [];
  const names = new Set();
  for (const line of log.split('\n')) {
    const m = line.match(/^\.keelson\/changes\/([^/]+)\/change\.md$/);
    if (m && m[1] !== 'archive') names.add(m[1]);
  }
  return [...names];
}

/** Ledgers of changes that were folded (deleted) — recovered from git history. */
export function historicalLedgers(root) {
  if (!isGitRepo(root)) return [];
  const log = git(root, ['log', '--diff-filter=D', '--name-only', '--pretty=format:@@%H', '--', '.keelson/changes']);
  if (!log) return [];
  const out = [];
  let commit = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@@')) {
      commit = line.slice(2);
      continue;
    }
    if (!commit || !/\.keelson\/changes\/[^/]+\/ledger\.md$/.test(line)) continue;
    const content = git(root, ['show', `${commit}^:${line}`]);
    if (content) out.push({ path: line, commit, content });
  }
  return out;
}

/** Files that import or require any of the given modules, by basename. Navigation, not proof. */
export function importers(root, files) {
  const names = [...new Set(files.map((f) => path.basename(f).replace(/\.(m?js|cjs|ts|tsx|jsx|py|go|rs|rb|java|kt|swift)$/, '')).filter(Boolean))];
  if (!names.length) return [];
  const pattern = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = `(import|require|from|include|use)\\b[^\\n]*\\b(${pattern})\\b`;
  // Git uses platform ERE implementations. Keep its expression to POSIX ERE:
  // GNU-only \b is not a word boundary there, and [^\n] excludes the letter n.
  const gitRe = `(import|require|from|include|use)([^A-Za-z0-9_].*[^A-Za-z0-9_]|[^A-Za-z0-9_])(${pattern})([^A-Za-z0-9_]|$)`;
  let matches = null;
  if (isGitRepo(root)) {
    try {
      const out = execFileSync('git', ['grep', '--untracked', '--exclude-standard', '-z', '-l', '-E', '-I', '--', gitRe], { cwd: root, encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      matches = nulRecords(out).map((file) => file.toString('utf8'));
    } catch (error) {
      // `git grep` uses status 1 for a successful search with no matches.
      if (error?.status === 1) matches = [];
    }
  }
  if (matches === null) {
    const hits = [];
    const rx = new RegExp(re);
    for (const f of walk(root, { ignore: ['node_modules', '.git', '.keelson', 'dist', 'build'] })) {
      if (!/\.(m?js|cjs|ts|tsx|jsx|py|go|rs|rb|java|kt|swift|vue|svelte)$/.test(f)) continue;
      try {
        if (rx.test(fs.readFileSync(path.join(root, f), 'utf8'))) hits.push(f);
      } catch {}
    }
    matches = hits;
  }
  const self = new Set(files.map((f) => f.replace(/\\/g, '/')));
  return matches.filter((file) => file && !self.has(file));
}
