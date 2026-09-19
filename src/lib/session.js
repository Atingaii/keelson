import crypto from 'node:crypto';
import path from 'node:path';
import { exists, listFiles, readJson, rmrf, writeJson } from './fs.js';

const SCHEMA = 1;

export const runtimeDir = (root) => path.join(root, '.keelson', '.runtime');
export const sessionsDir = (root) => path.join(runtimeDir(root), 'sessions');

export function resolveSessionIdentity(env = process.env) {
  const raw = typeof env.KEELSON_SESSION_ID === 'string' ? env.KEELSON_SESSION_ID.trim() : '';
  if (!raw) return null;
  const key = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
  return { key, source: 'KEELSON_SESSION_ID' };
}

export function sessionFile(root, key) {
  return path.join(sessionsDir(root), `${key}.json`);
}

export function readSession(root, env = process.env) {
  const id = resolveSessionIdentity(env);
  if (!id) return { available: false, key: null, source: null, state: null };
  const state = readJson(sessionFile(root, id.key), null);
  return { available: true, key: id.key, source: id.source, state };
}

export function writeSession(root, patch, env = process.env) {
  const id = resolveSessionIdentity(env);
  if (!id) return null;
  const file = sessionFile(root, id.key);
  const prev = readJson(file, {}) ?? {};
  const next = {
    schema: SCHEMA,
    change: null,
    createdAt: prev.createdAt ?? new Date().toISOString(),
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeJson(file, next);
  return { key: id.key, file, state: next };
}

export function bindSession(root, change, { branch = null, source = 'cli', env = process.env } = {}) {
  return writeSession(root, { change, branch, source }, env);
}

export function touchSession(root, { env = process.env, source = 'cli' } = {}) {
  return writeSession(root, { source }, env);
}

export function clearSession(root, env = process.env) {
  const id = resolveSessionIdentity(env);
  if (!id) return false;
  const file = sessionFile(root, id.key);
  if (!exists(file)) return false;
  rmrf(file);
  return true;
}

export function clearChangeBindings(root, change) {
  const dir = sessionsDir(root);
  let removed = 0;
  for (const file of listFiles(dir)) {
    if (!file.endsWith('.json')) continue;
    const full = path.join(dir, file);
    const state = readJson(full, null);
    if (state?.change !== change) continue;
    rmrf(full);
    removed += 1;
  }
  return removed;
}

export function listSessionStates(root) {
  const dir = sessionsDir(root);
  const out = [];
  for (const file of listFiles(dir)) {
    if (!file.endsWith('.json')) continue;
    const state = readJson(path.join(dir, file), null);
    if (state) out.push({ key: file.replace(/\.json$/, ''), ...state });
  }
  return out.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
}
