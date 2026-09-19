import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { PKG_ROOT, USER_HOME } from './paths.js';
import { readJson, writeJson, exists, readOr, mkdirp } from './fs.js';
import YAML from 'yaml';

export const TIERS = ['light', 'standard', 'deep'];
const REGISTRY_URL = 'https://raw.githubusercontent.com/Atingaii/keelson/main/registry/models.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const cachePath = () => path.join(USER_HOME, 'models.cache.json');
export const userOverridesPath = () => path.join(USER_HOME, 'models.yaml');

export function loadRegistry() {
  const cached = readJson(path.join(USER_HOME, 'registry.json'));
  const bundled = readJson(path.join(PKG_ROOT, 'registry', 'models.json'));
  if (cached && bundled && (cached.updated ?? '') >= (bundled.updated ?? '')) return cached;
  return bundled;
}

export function loadUserOverrides() {
  const raw = readOr(userOverridesPath(), '');
  if (!raw.trim()) return {};
  try {
    return YAML.parse(raw) ?? {};
  } catch {
    return {};
  }
}

export function saveUserOverrides(obj) {
  mkdirp(USER_HOME);
  const header = '# Keelson user-level model overrides. platform -> tier -> alias. Aliases only, never dated IDs.\n';
  fs.writeFileSync(userOverridesPath(), header + YAML.stringify(obj));
}

const which = (bin) => {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
};

const version = (bin) => {
  try {
    return execFileSync(bin, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 }).trim().split('\n')[0];
  } catch {
    return null;
  }
};

/** Local, network-free detection of tools, configured defaults, and provider keys. */
export function detectLocal() {
  const home = os.homedir();
  const tools = {};
  const platforms = readJson(path.join(PKG_ROOT, 'registry', 'platforms.json'), { platforms: {} }).platforms;
  for (const [id, p] of Object.entries(platforms)) {
    if (!p.bin) {
      tools[id] = { installed: null, version: null, defaultModel: null };
      continue;
    }
    const present = which(p.bin);
    tools[id] = { installed: present, version: present ? version(p.bin) : null, defaultModel: null };
  }
  const claudeSettings = readJson(path.join(home, '.claude', 'settings.json'), {});
  if (claudeSettings?.model) tools.claude.defaultModel = String(claudeSettings.model);
  if (process.env.ANTHROPIC_MODEL) tools.claude.defaultModel = process.env.ANTHROPIC_MODEL;
  const codexCfg = readOr(path.join(home, '.codex', 'config.toml'), '');
  const cm = codexCfg.match(/^\s*model\s*=\s*"([^"]+)"/m);
  if (cm) tools.codex.defaultModel = cm[1];
  if (process.env.OPENAI_MODEL) tools.codex.defaultModel = process.env.OPENAI_MODEL;

  const registry = loadRegistry();
  const keys = {};
  for (const [pid, p] of Object.entries(registry.providers ?? {})) keys[pid] = Boolean(process.env[p.env]);

  return { detectedAt: new Date().toISOString(), tools, keys };
}

export function loadCache() {
  const c = readJson(cachePath());
  if (!c) return null;
  const age = Date.now() - new Date(c.detectedAt ?? 0).getTime();
  return { ...c, stale: age > CACHE_TTL_MS };
}

export function saveCache(c) {
  mkdirp(USER_HOME);
  writeJson(cachePath(), c);
}

export function detectAndCache() {
  const c = { ...detectLocal(), unranked: loadCache()?.unranked ?? [] };
  saveCache(c);
  return c;
}

/**
 * Resolve tier → alias for a platform.
 * Order: explicit → project config → user overrides → registry → platform rank fallback.
 */
export function resolveTier(tier, { platform = 'claude', projectModels = {}, explicit = null } = {}) {
  if (!TIERS.includes(tier)) throw new Error(`unknown tier "${tier}" (expected ${TIERS.join('|')})`);
  if (explicit) return { alias: explicit, source: 'explicit' };
  const proj = projectModels?.[platform]?.[tier] ?? projectModels?.[tier];
  if (proj) return { alias: proj, source: 'project config' };
  const user = loadUserOverrides()?.[platform]?.[tier];
  if (user) return { alias: user, source: 'user overrides' };
  const reg = loadRegistry().platforms?.[platform];
  if (reg?.tiers?.[tier]) return { alias: reg.tiers[tier], source: 'registry' };
  if (reg?.rank?.length) {
    const r = reg.rank;
    const pick = { light: r[0], standard: r[Math.min(1, r.length - 1)], deep: r[r.length - 1] }[tier];
    return { alias: pick, source: 'registry rank fallback' };
  }
  return { alias: null, source: 'unresolved' };
}

export function resolveAll(platform, projectModels) {
  return Object.fromEntries(TIERS.map((t) => [t, resolveTier(t, { platform, projectModels })]));
}

/** Infer a tier from a family rank list and a model name. Returns null when unsure. */
export function inferTierFromName(name, families) {
  const n = name.toLowerCase();
  const ordered = families.filter((f) => f !== '');
  const hits = ordered.filter((f) => n.includes(f));
  if (hits.length !== 1) return null;
  const idx = families.indexOf(hits[0]);
  const last = families.length - 1;
  if (idx === 0) return 'light';
  if (idx === last) return 'deep';
  return 'standard';
}

export async function refresh({ fetchImpl = globalThis.fetch, withProviders = true } = {}) {
  const report = { registry: 'unchanged', providers: {}, newModels: [] };
  try {
    const res = await fetchImpl(REGISTRY_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const remote = await res.json();
      const local = loadRegistry();
      if ((remote.updated ?? '') > (local.updated ?? '')) {
        mkdirp(USER_HOME);
        writeJson(path.join(USER_HOME, 'registry.json'), remote);
        report.registry = `updated to ${remote.updated}`;
      }
    } else report.registry = `fetch failed (${res.status})`;
  } catch (e) {
    report.registry = `offline (${e.name})`;
  }
  if (!withProviders) return report;
  const registry = loadRegistry();
  const cache = loadCache() ?? detectAndCache();
  const known = new Set((cache.knownModels ?? []).map((m) => m.id));
  for (const [pid, p] of Object.entries(registry.providers ?? {})) {
    const key = process.env[p.env];
    if (!key || !p.catalogue) {
      report.providers[pid] = key ? 'no catalogue endpoint' : 'no key';
      continue;
    }
    try {
      const headers = pid === 'anthropic' ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' } : { Authorization: `Bearer ${key}` };
      const res = await fetchImpl(p.catalogue, { headers, signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        report.providers[pid] = `HTTP ${res.status}`;
        continue;
      }
      const body = await res.json();
      const ids = (body.data ?? []).map((m) => m.id).filter(Boolean);
      report.providers[pid] = `${ids.length} models`;
      for (const id of ids) {
        if (known.has(id)) continue;
        known.add(id);
        const inferred = inferTierFromName(id, p.families ?? []);
        const entry = { id, provider: pid, seen: new Date().toISOString().slice(0, 10), inferredTier: inferred };
        (cache.knownModels ??= []).push(entry);
        if (!inferred) (cache.unranked ??= []).push(entry);
        report.newModels.push(entry);
      }
    } catch (e) {
      report.providers[pid] = `error (${e.name})`;
    }
  }
  saveCache(cache);
  return report;
}

export function datedIdPatterns() {
  return (loadRegistry().dated_id_patterns ?? []).map((p) => new RegExp(p, 'i'));
}
