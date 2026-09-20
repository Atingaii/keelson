import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

/** Private state never requires changing the user's ignore rules. */
export function runtimeDir(root) {
  try {
    const gitPath = execFileSync('git', ['rev-parse', '--git-path', 'keelson-runtime'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return path.resolve(root, gitPath);
  } catch {
    const key = crypto.createHash('sha256').update(path.resolve(root)).digest('hex');
    return path.join(os.homedir(), '.cache', 'keelson', key);
  }
}
