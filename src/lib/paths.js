import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exists } from './fs.js';

export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KEELSON_DIR = '.keelson';
export const USER_HOME = path.join(os.homedir(), '.keelson');

/** Walk up from cwd to find the project root containing .keelson/. */
export function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (exists(path.join(dir, KEELSON_DIR))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function requireProjectRoot(start) {
  const root = findProjectRoot(start);
  if (!root) throw new Error('no .keelson/ found here or in any parent directory. Run `keelson init` first.');
  return root;
}

export const projectPaths = (root) => {
  const k = path.join(root, KEELSON_DIR);
  return {
    root,
    keelson: k,
    config: path.join(k, 'config.yaml'),
    intent: path.join(k, 'INTENT.md'),
    now: path.join(k, 'NOW.md'),
    specs: path.join(k, 'specs'),
    rules: path.join(k, 'rules'),
    rulesIndex: path.join(k, 'rules', 'index.md'),
    changes: path.join(k, 'changes'),
    archive: path.join(k, 'changes', 'archive'),
    hooks: path.join(k, 'hooks'),
    templates: path.join(k, 'templates'),
  };
};
