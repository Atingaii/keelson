import { createRequire } from 'node:module';
import { parseArgs } from './lib/args.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

const COMMANDS = {
  init: ['init [--tools claude,codex,cursor,opencode,gemini] [--profile lean|guided] [--lang en|zh] [--no-hooks] [--onboard]', 'Set up .keelson/ and install the skill, resident block, and hooks', () => import('./commands/init.js').then((m) => m.init)],
  update: ['update', 'Regenerate skill files, resident blocks, and hooks after upgrading', () => import('./commands/init.js').then((m) => m.init)],
  context: ['context [--paths a/,b/**] [--json]', 'Print INTENT, NOW, active changes, and the rules matching the given paths', () => import('./commands/context.js').then((m) => m.context)],
  new: ['new <name> [--tier quick|spec] [--capability <name>]', 'Scaffold a change directory', () => import('./commands/new.js').then((m) => m.newChange)],
  status: ['status [--json]', 'Show active changes, phases, tasks, and NOW.md', () => import('./commands/status.js').then((m) => m.status)],
  validate: ['validate [--json]', 'Check .keelson/ structure, specs, changes, ledgers; non-zero on errors', () => import('./commands/validate.js').then((m) => m.validate)],
  check: ['check [--quiet] [--json]', 'Run the project checks from config.yaml and report exit codes', () => import('./commands/check.js').then((m) => m.check)],
  land: ['land [name] [--now "<text>"] [--keep] [--force] [--dry-run]', 'Merge delta specs, fold decisions, remove or archive the change', () => import('./commands/land.js').then((m) => m.land)],
  retro: ['retro [--json]', 'Metrics from ledgers plus suggestions to prune guidance or add rules', () => import('./commands/retro.js').then((m) => m.retro)],
  models: ['models [--detect] [--refresh] [--resolve <tier>] [rank <alias> <tier>] [--platform <id>]', 'Resolve effort tiers to model aliases for this platform', () => import('./commands/models.js').then((m) => m.models)],
  ablate: ['ablate [--dry-run]', 'Temporarily remove every Keelson surface for an A/B comparison', () => import('./commands/ablate.js').then((m) => m.ablate)],
  restore: ['restore [--force] [--dry-run]', 'Restore an ablated project byte-for-byte', () => import('./commands/ablate.js').then((m) => m.restore)],
};

export function help() {
  const lines = [`keelson ${version} — a load-bearing workflow layer for AI coding agents`, '', 'Usage: keelson <command> [options]', ''];
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
