import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { after } from 'node:test';
import { runtimeDir } from '../src/lib/runtime-path.js';

export const BIN = path.resolve('bin/keelson.js');
const ownedProjects = new Set();
after(() => {
  for (const dir of ownedProjects) {
    const runtime = runtimeDir(dir);
    fs.rmSync(runtime, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

export function tmpProject(files = {}) {
  // Child-process cwd resolves directory aliases (for example /var on macOS).
  // Use that same identity for expected runtime paths and fixture cleanup.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-')));
  ownedProjects.add(dir);
  for (const [f, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), content);
  }
  return dir;
}

export function run(cwd, args, { env = {}, allowFail = false } = {}) {
  try {
    const stdout = execFileSync('node', [BIN, ...args], { cwd, encoding: 'utf8', env: { ...process.env, CODEX_THREAD_ID: '', KEELSON_SESSION_ID: '', PI_SESSION_ID: '', NO_COLOR: '1', HOME: env.HOME ?? process.env.HOME, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    if (!allowFail) throw new Error(`keelson ${args.join(' ')} failed: ${e.stderr || e.stdout}`);
    return { code: e.status, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

export const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8');
export const exists = (dir, f) => fs.existsSync(path.join(dir, f));
export const write = (dir, f, s) => {
  fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
  fs.writeFileSync(path.join(dir, f), s);
};
