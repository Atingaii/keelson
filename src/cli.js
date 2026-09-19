import { createRequire } from 'node:module';
import { parseArgs } from './lib/args.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const COMMANDS = {
  init: ['init [--<platform> ...] [--tools a,b] [--guide] [--profile lean|guided] [--lang en|zh] [--no-hooks] [--dry-run]', 'Set up the canonical .keelson/ runtime for the tools you use (auto-detected when none given), plus discovery shims and hooks. The agent drafts INTENT, specs, and rules on first contact', () => import('./commands/init.js').then((m) => m.init)],
  platforms: ['platforms [--json]', 'List supported coding tools, their file locations, and which are installed or configured', () => import('./commands/platforms.js').then((m) => m.platforms)],
  update: ['update [--dry-run]', 'Refresh the canonical .keelson/ runtime, discovery shims, and hooks after upgrading; migrates config.yaml', () => import('./commands/init.js').then((m) => m.init)],
  context: ['context [--paths a/,b/**] [--json]', 'Print INTENT, ROADMAP, NOW, active changes, existing references, and the rules matching the given paths', () => import('./commands/context.js').then((m) => m.context)],
  impact: ['impact <file> [file...] [--json]', 'Mechanical impact hints: importers, specs and rules that may be affected, active changes that overlap', () => import('./commands/impact.js').then((m) => m.impact)],
  new: ['new <name> [--tier quick|spec] [--capability a,b] [--touches globs] [--depends change] [--worktree]', 'Scaffold a change directory (owner, branch, delta base recorded)', () => import('./commands/new.js').then((m) => m.newChange)],
  status: ['status [--json]', 'Work, verification, and release status per change; slices, open questions, conflicts, handoffs', () => import('./commands/status.js').then((m) => m.status)],
  handoff: ['handoff [name] [--by who]', 'Create or re-stamp handoff.md for a change (at, updated, by)', () => import('./commands/handoff.js').then((m) => m.handoff)],
  validate: ['validate [--json]', 'Check .keelson/ structure, specs, changes, ledgers; non-zero on errors', () => import('./commands/validate.js').then((m) => m.validate)],
  check: ['check [cmd...] [--record [claim]] [--change name] [--quiet] [--json]', 'Run the project checks, save evidence, print or record a Verify entry with the worktree fingerprint', () => import('./commands/check.js').then((m) => m.check)],
  land: ['land [name] [--now "<text>"] [--confirm-assumptions] [--accept-drift] [--keep] [--force] [--dry-run]', 'Merge delta specs, fold decisions, remove or archive the change; refuses on stale or missing evidence', () => import('./commands/land.js').then((m) => m.land)],
  cancel: ['cancel <name> [--reason "<why>"]', 'Archive a change as cancelled without merging anything', () => import('./commands/land.js').then((m) => m.cancel)],
  retro: ['retro [--json]', 'Metrics from ledgers plus suggestions to prune guidance or add rules', () => import('./commands/retro.js').then((m) => m.retro)],
  models: ['models [--detect] [--refresh] [--resolve <tier>] [rank <alias> <tier>] [--platform <id>]', 'Resolve effort tiers to model aliases for this platform', () => import('./commands/models.js').then((m) => m.models)],
  doctor: ['doctor [--json]', 'Diagnose the install: versions, hooks, config migration, validation, stale evidence, conflicts', () => import('./commands/doctor.js').then((m) => m.doctor)],
  ablate: ['ablate [--dry-run]', 'Temporarily remove every Keelson surface for an A/B comparison', () => import('./commands/ablate.js').then((m) => m.ablate)],
  restore: ['restore [--force] [--dry-run]', 'Restore an ablated project byte-for-byte', () => import('./commands/ablate.js').then((m) => m.restore)],
  uninstall: ['uninstall [--purge]', 'Remove generated surfaces; keep .keelson/ unless --purge', () => import('./commands/uninstall.js').then((m) => m.uninstall)],
};

export function help() {
  const lines = [`keelson ${version} — an engineering collaboration layer for coding agents on long-lived projects`, '', 'Usage: keelson <command> [options]', ''];
  for (const [, [usage, desc]] of Object.entries(COMMANDS)) lines.push(`  ${usage}`, `      ${desc}`);
  lines.push('', 'Docs: https://github.com/Atingaii/keelson');
  return lines.join('\n');
}

export async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  const cmd = positional.shift();
  if (flags.version || cmd === 'version') {
    console.log(version);
    return 0;
  }
  if (flags.help && cmd && COMMANDS[cmd]) {
    console.log(`Usage: keelson ${COMMANDS[cmd][0]}\n\n  ${COMMANDS[cmd][1]}`);
    return 0;
  }
  if (!cmd || flags.help || cmd === 'help') {
    console.log(help());
    return 0;
  }
  const entry = COMMANDS[cmd];
  if (!entry) {
    console.error(`unknown command "${cmd}"\n`);
    console.log(help());
    return 2;
  }
  const run = await entry[2]();
  return run({ flags, positional });
}
