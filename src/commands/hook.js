import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PKG_ROOT } from '../lib/paths.js';

const HOOKS = new Map([
  ['session-start', 'session-start.mjs'],
  ['prompt-state', 'prompt-state.mjs'],
  ['codebuddy-session', 'codebuddy-session.mjs'],
]);

/** Execute a package-owned hook; project installs never copy executable hook code. */
export async function hook({ positional = [] }, cwd = process.cwd()) {
  const name = positional[0];
  const file = HOOKS.get(name);
  if (!file) throw new Error(`unknown hook "${name}". Supported hooks: ${[...HOOKS.keys()].join(', ')}`);
  const child = spawnSync(process.execPath, [path.join(PKG_ROOT, 'hooks', file)], {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });
  if (child.error) throw child.error;
  return Number.isInteger(child.status) ? child.status : 1;
}
