import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { exists } from './fs.js';
import { loadConfig } from './config.js';

export const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KEELSON_DIR = '.keelson';
export const USER_HOME = path.join(os.homedir(), '.keelson');

/** A project root is a directory whose .keelson/ holds config.yaml or INTENT.md. The user-level ~/.keelson never counts. */
export const isProjectRoot = (dir) => {
  const k = path.join(dir, KEELSON_DIR);
  if (path.resolve(k) === path.resolve(USER_HOME)) return false;
  return exists(path.join(k, 'config.yaml')) || exists(path.join(k, 'INTENT.md'));
};

/** Walk up from cwd to find the project root containing .keelson/. */
export function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (isProjectRoot(dir)) return dir;
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

/** Resolve every path Keelson uses. `paths.specs` in config.yaml may relocate the contracts. */
export const projectPaths = (root, cfg = null) => {
  const k = path.join(root, KEELSON_DIR);
  const config = path.join(k, 'config.yaml');
  const c = cfg ?? (exists(config) ? loadConfig(config) : null);
  const specsRel = c?.paths?.specs ?? '.keelson/specs';
  return {
    root,
    keelson: k,
    config,
    readme: path.join(k, 'README.md'),
    intent: path.join(k, 'INTENT.md'),
    now: path.join(k, 'NOW.md'),
    roadmap: path.join(k, 'ROADMAP.md'),
    glossary: path.join(k, 'GLOSSARY.md'),
    workflow: path.join(k, 'workflow.md'),
    skill: path.join(k, 'skill'),
    specs: path.resolve(root, specsRel),
    specsRel,
    rules: path.join(k, 'rules'),
    rulesIndex: path.join(k, 'rules', 'index.md'),
    changes: path.join(k, 'changes'),
    archive: path.join(k, 'changes', 'archive'),
    hooks: path.join(k, 'hooks'),
    runtime: path.join(k, '.runtime'),
    sessions: path.join(k, '.runtime', 'sessions'),
    evidence: path.join(k, '.runtime', 'evidence'),
    legacyLocal: path.join(k, '.local'),
  };
};
