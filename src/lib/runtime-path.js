import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const resolved = new Map();

/** Private state never requires changing the user's ignore rules. */
export function runtimeDir(root) {
  const key = path.resolve(root);
  if (resolved.has(key)) return resolved.get(key);
  let runtime;
  try {
    const gitPath = execFileSync('git', ['rev-parse', '--git-path', 'keelson-runtime'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    runtime = path.resolve(root, gitPath);
  } catch {
    const fallback = crypto.createHash('sha256').update(key).digest('hex');
    runtime = path.join(os.homedir(), '.cache', 'keelson', fallback);
  }
  resolved.set(key, runtime);
  return runtime;
}
