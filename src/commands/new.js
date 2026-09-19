import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, write, read, mkdirp } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { skillSource } from '../platforms/index.js';
import { slugify, TIERS } from '../lib/changes.js';
import { ok, info } from '../lib/out.js';

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

export async function newChange({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const cfg = loadConfig(p.config);
  const raw = positional[0] ?? flags.name;
  if (!raw) throw new Error('usage: keelson new <name> [--tier quick|spec] [--capability <name>]');
  const name = slugify(raw);
  const tier = (flags.tier ?? 'quick').toLowerCase();
  if (!TIERS.includes(tier)) throw new Error(`tier must be one of ${TIERS.join('|')}`);
  const dir = path.join(p.changes, name);
  if (exists(dir)) throw new Error(`change "${name}" already exists`);
  const tpl = path.join(skillSource(cfg.lang), 'templates');
  const vars = { name, title: raw, tier, date: new Date().toISOString().slice(0, 10), capability: flags.capability ?? '<capability>' };
  mkdirp(dir);
  write(path.join(dir, 'change.md'), fill(read(path.join(tpl, tier === 'quick' ? 'change-quick.md' : 'change.md')), vars));
  write(path.join(dir, 'tasks.md'), fill(read(path.join(tpl, 'tasks.md')), vars));
  write(path.join(dir, 'ledger.md'), fill(read(path.join(tpl, 'ledger.md')), vars));
  if (tier === 'spec') {
    const cap = flags.capability ? slugify(flags.capability) : null;
    const deltaDir = path.join(dir, 'specs', cap ?? '<capability>');
    if (cap) {
      write(path.join(deltaDir, 'spec.md'), fill(read(path.join(tpl, 'delta-spec.md')), vars));
    }
  }
  ok(`created .keelson/changes/${name} (${tier})`);
  info(`fill change.md${tier === 'spec' ? ', specs/<capability>/spec.md' : ''}, then tasks.md — see the keelson skill's references/plan.md`);
  if (flags.json) console.log(JSON.stringify({ name, tier, dir }));
  return 0;
}
