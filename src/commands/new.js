import path from 'node:path';
import crypto from 'node:crypto';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, write, read, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { skillSource } from '../platforms/index.js';
import { slugify, TIERS } from '../lib/changes.js';
import { git, isGitRepo, currentBranch, gitUserName } from '../lib/git.js';
import { list } from '../lib/args.js';
import { ok, info, warn } from '../lib/out.js';

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
export const specBase = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

export async function newChange({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const raw = positional[0] ?? flags.name;
  if (!raw) throw new Error('usage: keelson new <name> [--tier quick|spec] [--capability a,b] [--touches src/api/**,...] [--depends other-change] [--worktree]');
  const name = slugify(raw);
  const tier = (flags.tier ?? 'quick').toLowerCase();
  if (!TIERS.includes(tier)) throw new Error(`tier must be one of ${TIERS.join('|')}`);
  const dir = path.join(p.changes, name);
  if (exists(dir)) throw new Error(`change "${name}" already exists`);
  const tpl = path.join(skillSource(cfg.lang), 'templates');
  const caps = list(flags.capability).map(slugify);
  const owner = flags.owner ?? gitUserName(root);
  const branch = isGitRepo(root) ? currentBranch(root) : null;
  const vars = { name, title: raw, tier, date: new Date().toISOString().slice(0, 10), capability: caps[0] ?? '<capability>' };

  let worktree = null;
  if (flags.worktree) {
    if (!isGitRepo(root)) throw new Error('--worktree needs a git repository');
    const wt = path.resolve(root, '..', `${path.basename(root)}-${name}`);
    const out = git(root, ['worktree', 'add', '-b', name, wt], { allowFail: true });
    if (out === null && !exists(wt)) throw new Error(`git worktree add failed for ${wt}`);
    worktree = wt;
    ok(`worktree ${wt} on branch ${name}`);
  }

  const front = [
    `tier: ${tier}`,
    `created: ${vars.date}`,
    `status: ${tier === 'spec' ? 'clarifying' : 'in-progress'}`,
    `owner: ${owner}`,
    ...(worktree ? [`branch: ${name}`, `worktree: ${path.relative(root, worktree)}`] : branch ? [`branch: ${branch}`] : []),
    ...(list(flags.depends).length ? [`depends: [${list(flags.depends).join(', ')}]`] : []),
    ...(list(flags.touches).length ? [`touches: [${list(flags.touches).join(', ')}]`] : []),
  ];
  const body = fill(read(path.join(tpl, tier === 'quick' ? 'change-quick.md' : 'change.md')), vars).replace(/^---\n[\s\S]*?\n---\n/, '');
  mkdirp(dir);
  write(path.join(dir, 'change.md'), `---\n${front.join('\n')}\n---\n${body}`);
  if (tier === 'spec') write(path.join(dir, 'tasks.md'), fill(read(path.join(tpl, 'tasks.md')), vars));
  // ledger.md and handoff.md are event artifacts: create them only when evidence or a handoff actually exists.
  for (const cap of caps) {
    const mainPath = path.join(p.specs, cap, 'spec.md');
    const main = readOr(mainPath, '');
    const delta = fill(read(path.join(tpl, 'delta-spec.md')), { ...vars, capability: cap });
    // Stamp the base so `keelson land` can detect that the main spec moved while this delta was being written.
    write(path.join(dir, 'specs', cap, 'spec.md'), `---\nbase: ${main ? specBase(main) : 'new'}\n---\n${delta}`);
  }
  ok(`created ${path.relative(root, dir)} (${tier}${owner ? `, owner ${owner}` : ''}${branch && !worktree ? `, branch ${branch}` : ''})`);
  info(tier === 'spec' ? `fill change.md${caps.length ? ', specs/<capability>/spec.md' : ''}, then tasks.md — see references/plan.md` : 'fill change.md acceptance; tasks.md is optional for a quick change');
  if (tier === 'spec' && !caps.length) warn('spec tier without --capability: add specs/<capability>/spec.md by hand if behaviour changes');
  if (flags.json) console.log(JSON.stringify({ name, tier, dir, owner, branch: worktree ? name : branch, worktree, capabilities: caps }));
  return 0;
}
