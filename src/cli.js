import { createRequire } from 'node:module';
import { parseArgs } from './lib/args.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const COMMANDS = {
  ask: ['ask <add|frontier|list|settle|assume|reject|reopen> [id] [--change name] [--json]', 'Persist decisions and show up to three ready owner questions', () => import('./commands/ask.js').then((m) => m.ask)],
  design: ['design [action] [target] [--lang en|zh] [--json]', 'Prepare focused frontend design guidance for your agent', () => import('./commands/design.js').then((m) => m.design)],
  guide: ['guide [reference] [--list] [--json] [--lang en|zh]', 'Read the installed workflow or one reference on demand', () => import('./commands/guide.js').then((m) => m.guide)],
  hook: ['hook <event>', 'Run an installed host adapter', () => import('./commands/hook.js').then((m) => m.hook)],
  attest: ['attest [change] [--json]', 'Export structured evidence and its local trust status', () => import('./commands/attest.js').then((m) => m.attest)],
  init: ['init [--<platform> ...] [--tools a,b] [--guide] [--profile lean|guided] [--lang en|zh] [--no-hooks] [--vendor] [--dry-run]', 'Set up the minimal .keelson/ control plane and host discovery. Project artifacts grow only when the work needs them', () => import('./commands/init.js').then((m) => m.init)],
  platforms: ['platforms [--json]', 'List supported coding tools, their file locations, and which are installed or configured', () => import('./commands/platforms.js').then((m) => m.platforms)],
  update: ['update [--vendor] [--dry-run]', 'Refresh owned host shims and configuration; --vendor opts into copied guidance', () => import('./commands/init.js').then((m) => m.init)],
  context: ['context [--paths a/,b/**] [--json]', 'Print INTENT, ROADMAP, NOW, active changes, existing references, and the rules matching the given paths', () => import('./commands/context.js').then((m) => m.context)],
  impact: ['impact <file> [file...] [--json]', 'Mechanical impact hints: importers, specs and rules that may be affected, active changes that overlap', () => import('./commands/impact.js').then((m) => m.impact)],
  focus: ['focus [change] [--auto|--clear] [--json]', 'Bind this AI session to one active change without changing the change lifecycle', () => import('./commands/focus.js').then((m) => m.focus)],
  new: ['new <name> [--tier quick|spec] [--capability a,b] [--touches globs] [--depends change] [--worktree]', 'Scaffold a change directory (owner, branch, delta base recorded)', () => import('./commands/new.js').then((m) => m.newChange)],
  status: ['status [--json]', 'Work, verification, and release status per change; slices, open questions, conflicts, handoffs', () => import('./commands/status.js').then((m) => m.status)],
  handoff: ['handoff [name] [--by who]', 'Create or re-stamp handoff.md for a change (at, updated, by)', () => import('./commands/handoff.js').then((m) => m.handoff)],
  validate: ['validate [--json]', 'Check .keelson/ structure, specs, changes, ledgers; non-zero on errors', () => import('./commands/validate.js').then((m) => m.validate)],
  check: ['check [cmd...] [--record [claim]] [--change name] [--trust] [--timeout ms] [--quiet] [--json]', 'Run the project checks, save evidence, print or record a Verify entry with the worktree fingerprint', () => import('./commands/check.js').then((m) => m.check)],
  land: ['land [name] [--now "<text>"] [--confirm-assumptions] [--accept-drift] [--keep] [--force --reason "<why>"] [--dry-run]', 'Merge delta specs, fold decisions, remove or archive the change; refuses on stale or missing evidence', () => import('./commands/land.js').then((m) => m.land)],
  cancel: ['cancel <name> [--reason "<why>"]', 'Archive a change as cancelled without merging anything', () => import('./commands/land.js').then((m) => m.cancel)],
  retro: ['retro [--json]', 'Metrics from ledgers plus suggestions to prune guidance or add rules', () => import('./commands/retro.js').then((m) => m.retro)],
  models: ['models [--detect] [--refresh] [--resolve <tier>] [rank <alias> <tier>] [--platform <id>]', 'Resolve effort tiers to model aliases for this platform', () => import('./commands/models.js').then((m) => m.models)],
  doctor: ['doctor [--session] [--json]', 'Diagnose the install: versions, hooks, config migration, validation, stale evidence, conflicts', () => import('./commands/doctor.js').then((m) => m.doctor)],
  ablate: ['ablate [--dry-run]', 'Temporarily disable Keelson integration, preserving it for restore', () => import('./commands/ablate.js').then((m) => m.ablate)],
  restore: ['restore [--force] [--dry-run]', 'Restore an ablated project byte-for-byte', () => import('./commands/ablate.js').then((m) => m.restore)],
  uninstall: ['uninstall [--purge]', 'Remove generated surfaces; keep .keelson/ unless --purge', () => import('./commands/uninstall.js').then((m) => m.uninstall)],
};

const COMMAND_GROUPS = [
  ['Your commands', ['init', 'design', 'status', 'doctor', 'update', 'platforms', 'uninstall']],
  ['Agent workflow', ['ask', 'context', 'impact', 'focus', 'new', 'check', 'handoff', 'validate', 'land', 'cancel']],
  ['Maintenance / advanced', ['guide', 'attest', 'retro', 'models', 'ablate', 'restore']],
];

export function help({ all = false } = {}) {
  const lines = [
    `keelson ${version} — verifiable checks and durable decisions for coding agents`,
    '',
    'Usage: keelson <command> [options]',
    'Normal use: run `keelson init` once, then talk to your coding agent as usual.',
  ];
  for (const [title, names] of COMMAND_GROUPS) {
    lines.push('', `${title}:`);
    for (const name of names) {
      const [usage, desc] = COMMANDS[name];
      if (all) lines.push(`  ${usage}`, `      ${desc}`);
      else lines.push(`  ${name.padEnd(12)} ${desc.split(';')[0].split('. ')[0]}`);
    }
  }
  lines.push('', 'Details: keelson help <command> · All options: keelson --help --all', '', 'Docs: https://github.com/Atingaii/keelson/tree/main/docs');
  return lines.join('\n');
}

export async function main(argv) {
  const { flags, positional } = parseArgs(argv);
  let cmd = positional.shift();
  if (flags.h) flags.help = true;
  if (flags.v) flags.version = true;
  if (cmd === 'help') {
    cmd = positional.shift();
    flags.help = true;
  }
  if (flags.version || cmd === 'version') {
    console.log(version);
    return 0;
  }
  if (flags.help && cmd && Object.hasOwn(COMMANDS, cmd)) {
    console.log(`Usage: keelson ${COMMANDS[cmd][0]}\n\n  ${COMMANDS[cmd][1]}`);
    return 0;
  }
  if (!cmd) {
    console.log(help({ all: Boolean(flags.all) }));
    return 0;
  }
  const entry = Object.hasOwn(COMMANDS, cmd) ? COMMANDS[cmd] : undefined;
  if (!entry) {
    console.error(`unknown command "${cmd}". Run \`keelson --help\` to list commands.`);
    return 2;
  }
  const run = await entry[2]();
  return run({ flags, positional });
}
