import path from 'node:path';

export const METHOD_IDS = ['bare', 'openspec', 'trellis', 'superpowers', 'keelson'];

export function validateTask(task) {
  const required = ['id', 'repository', 'baseline_sha', 'upstream_fix_sha', 'required_source_files', 'hidden_test'];
  const missing = required.filter((key) => task[key] === undefined || task[key] === '');
  if (missing.length) throw new Error(`task metadata missing: ${missing.join(', ')}`);
  if (!/^https:\/\//.test(task.repository)) throw new Error('task repository must be an https URL');
  for (const key of ['baseline_sha', 'upstream_fix_sha']) {
    if (!/^[0-9a-f]{40}$/.test(task[key])) throw new Error(`${key} must be a full SHA`);
  }
  if (!Number.isInteger(task.required_source_files) || task.required_source_files < 1) {
    throw new Error('required_source_files must be a positive integer');
  }
  return task;
}

export function sourcePaths(paths) {
  return [...new Set(paths.filter((entry) => entry.startsWith('src/')))];
}

export function summarizeRun({ codexExitCode, publicVerificationExitCode, acceptanceExitCode, changedPaths, requiredSourceFiles, elapsedMs, tokens }) {
  const source = sourcePaths(changedPaths);
  const result = {
    codex_exit_code: codexExitCode,
    public_verification_exit_code: publicVerificationExitCode,
    acceptance_exit_code: acceptanceExitCode,
    changed_source_files: source,
    source_file_threshold: requiredSourceFiles,
    source_file_threshold_met: source.length >= requiredSourceFiles,
    elapsed_ms: elapsedMs,
    tokens: tokens ?? null,
  };
  result.regression_pass = result.public_verification_exit_code === 0;
  result.acceptance_pass = result.acceptance_exit_code === 0;
  result.pass = result.codex_exit_code === 0
    && result.regression_pass
    && result.acceptance_pass
    && result.source_file_threshold_met;
  return result;
}

export function relativePaths(root, absolutePaths) {
  return absolutePaths.map((entry) => path.relative(root, entry));
}

export function finalPatch(worktree, gitRun, { baseRef = 'benchmark-baseline', excludePaths = [] } = {}) {
  const tracked = gitRun(worktree, ['diff', '--binary', '--no-ext-diff', baseRef]);
  if (tracked.exit_code !== 0) throw new Error(`could not create tracked patch: ${tracked.stderr}`);
  const untracked = gitRun(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  if (untracked.exit_code !== 0) throw new Error(`could not inspect untracked paths: ${untracked.stderr}`);
  const excluded = new Set(excludePaths);
  const paths = untracked.stdout.split('\0').filter(Boolean)
    .filter((entry) => !entry.startsWith('.bench-') && !excluded.has(entry));
  const additions = paths.map((entry) => gitRun(worktree, ['diff', '--binary', '--no-index', '--', '/dev/null', entry]).stdout);
  return { patch: `${tracked.stdout}${additions.join('')}`, untracked_paths: paths };
}

export function findUsage(value) {
  const matches = [];
  const walk = (item) => {
    if (!item || typeof item !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(item, 'input_tokens')
      || Object.prototype.hasOwnProperty.call(item, 'output_tokens')) {
      matches.push(item);
    }
    for (const child of Object.values(item)) walk(child);
  };
  walk(value);
  return matches.at(-1) ?? null;
}
