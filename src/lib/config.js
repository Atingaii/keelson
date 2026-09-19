import YAML from 'yaml';
import { readOr, write } from './fs.js';

export const CONFIG_VERSION = 2;

export const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,
  tools: ['claude'],
  lang: 'en',
  profile: 'lean',
  default_tier: 'auto',
  confirm: { quick: 'proceed', spec: 'wait' },
  land: 'fold',
  check: [],
  context: '',
  paths: { specs: '.keelson/specs' },
  refs: { architecture: null, decisions: null, tasks: null, ci: null },
  models: {},
  effort: { review_min: 'standard', plan_min: 'deep', verify_min: 'deep', escalate_after: 2 },
};

export function parseConfig(raw, configPath = 'config.yaml') {
  let parsed = {};
  if (raw.trim()) {
    try {
      parsed = YAML.parse(raw) ?? {};
    } catch (e) {
      throw new Error(`cannot parse ${configPath}: ${e.message}`);
    }
  }
  return migrate(deepMerge(structuredClone(DEFAULT_CONFIG), parsed), parsed.version ?? 1);
}

export function loadConfig(configPath) {
  return parseConfig(readOr(configPath, ''), configPath);
}

/** Bring older config shapes up to the current version. Pure; never touches disk. */
export function migrate(cfg, fromVersion) {
  const out = { ...cfg };
  if (fromVersion < 2) {
    out.paths = { ...DEFAULT_CONFIG.paths, ...(out.paths ?? {}) };
    out.refs = { ...DEFAULT_CONFIG.refs, ...(out.refs ?? {}) };
  }
  out.version = CONFIG_VERSION;
  return out;
}

export function saveConfig(configPath, cfg) {
  write(configPath, renderConfig(cfg));
}

export function renderConfig(cfg) {
  const doc = new YAML.Document(cfg);
  return [
    '# Keelson project configuration. Every key is optional; defaults are shown.',
    '# paths.specs: where behaviour contracts live. refs.*: existing project material, referenced, never copied.',
    '# Docs: https://github.com/Atingaii/keelson/blob/main/docs/configuration.md',
    doc.toString(),
  ].join('\n');
}

function deepMerge(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra)) return extra ?? base;
  if (typeof base !== 'object' || base === null) return extra ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(extra ?? {})) {
    out[k] = typeof v === 'object' && v !== null && !Array.isArray(v) && typeof base[k] === 'object' && base[k] !== null ? deepMerge(base[k], v) : v;
  }
  return out;
}
