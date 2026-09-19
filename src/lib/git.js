import { execFileSync } from 'node:child_process';

export function git(root, args, { allowFail = true } = {}) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    if (allowFail) return null;
    throw e;
  }
}

export const isGitRepo = (root) => git(root, ['rev-parse', '--is-inside-work-tree']) === 'true';

export function gitStatusShort(root) {
  const s = git(root, ['status', '--porcelain']);
  return s === null ? null : s.split('\n').filter(Boolean);
}

export function recentCommits(root, n = 5) {
  const s = git(root, ['log', `-${n}`, '--pretty=%h %s']);
  return s ? s.split('\n') : [];
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
