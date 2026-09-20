import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { walk } from './fs.js';

export function git(root, args, { allowFail = true, env = {} } = {}) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } }).trim();
  } catch (e) {
    if (allowFail) return null;
    throw e;
  }
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

/**
 * Fingerprint of the working tree with `.keelson/` excluded, so a ledger append does not invalidate its own evidence.
 * Git: a real tree object built from a throw-away index (tracked + untracked, .gitignore respected). No git: content hash.
 */
export function worktreeFingerprint(root) {
  if (isGitRepo(root)) {
    const idx = path.join(os.tmpdir(), `keelson-index-${crypto.randomUUID()}`);
    try {
      const env = { GIT_INDEX_FILE: idx };
      git(root, ['add', '-A', '--', '.', ':(exclude).keelson'], { env, allowFail: false });
      return git(root, ['write-tree'], { env, allowFail: false });
    } finally {
      fs.rmSync(idx, { force: true });
    }
  }
  const h = crypto.createHash('sha256');
  for (const f of walk(root, { ignore: ['node_modules', '.git', '.keelson'] })) {
    const full = path.join(root, f);
    const stat = fs.lstatSync(full);
    h.update(f).update('\0').update(String(stat.mode)).update('\0');
    h.update(stat.isSymbolicLink() ? fs.readlinkSync(full) : fs.readFileSync(full)).update('\0');
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
  let out = null;
  if (isGitRepo(root)) out = git(root, ['grep', '-l', '-E', '-I', '--', re]);
  if (out === null) {
    const hits = [];
    const rx = new RegExp(re);
    for (const f of walk(root, { ignore: ['node_modules', '.git', '.keelson', 'dist', 'build'] })) {
      if (!/\.(m?js|cjs|ts|tsx|jsx|py|go|rs|rb|java|kt|swift|vue|svelte)$/.test(f)) continue;
      try {
        if (rx.test(fs.readFileSync(path.join(root, f), 'utf8'))) hits.push(f);
      } catch {}
    }
    out = hits.join('\n');
  }
  const self = new Set(files.map((f) => f.replace(/\\/g, '/')));
  return out.split('\n').filter((l) => l && !self.has(l));
}
