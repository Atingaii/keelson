import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exists, listFiles, readJson, withLock, writeJson } from './fs.js';
import { runtimeDir } from './runtime-path.js';

// The short shared lock makes registration atomic with respect to landing.
// Checks may run concurrently; landing refuses while any check is in flight.
export function beginCheck(root) {
  const runtime = runtimeDir(root);
  const marker = path.join(runtime, 'running-checks', `${crypto.randomUUID()}.json`);
  withLock(path.join(runtime, 'landing'), () => writeJson(marker, { pid: process.pid, startedOn: new Date().toISOString() }));
  return () => fs.rmSync(marker, { force: true });
}

export function activeChecks(root) {
  const dir = path.join(runtimeDir(root), 'running-checks');
  return listFiles(dir).filter((file) => {
    const marker = path.join(dir, file);
    if (!exists(marker)) return false;
    const data = readJson(marker);
    try { process.kill(data.pid, 0); return true; }
    catch (error) {
      if (error.code !== 'ESRCH') return true;
      fs.rmSync(marker, { force: true });
      return false;
    }
  });
}
