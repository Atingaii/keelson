import YAML from 'yaml';
import { readOr, write } from './fs.js';

export const DEFAULT_CONFIG = {
  version: 1,
  tools: ['claude'],
  lang: 'en',
  profile: 'lean',
  default_tier: 'auto',
  confirm: { quick: 'proceed', spec: 'wait' },
  land: 'fold',
  check: [],
  context: '',
  models: {},
  effort: { review_min: 'standard', plan_min: 'deep', verify_min: 'deep', escalate_after: 2 },
};

export function loadConfig(configPath) {
  const raw = readOr(configPath, '');
  let parsed = {};
  if (raw.trim()) {
    try {
      parsed = YAML.parse(raw) ?? {};
    } catch (e) {
      throw new Error(`cannot parse ${configPath}: ${e.message}`);
    }
  }
  return deepMerge(structuredClone(DEFAULT_CONFIG), parsed);
}

export function saveConfig(configPath, cfg) {
  write(configPath, renderConfig(cfg));
}

export function renderConfig(cfg) {
  const doc = new YAML.Document(cfg);
  return [
    '# Keelson project configuration. Every key is optional; defaults are shown.',
    '# Docs: https://github.com/Atingaii/keelson/blob/main/docs/configuration.md',
    doc.toString(),
  ].join('\n');
}

function deepMerge(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra)) return extra ?? base;
  if (typeof base !== 'object' || base === null) return extra ?? base;
  const out = { ...base };
  for (const [k, v] of Object.entries(extra ?? {})) {
    out[k] = typeof v === 'object' && v !== null && !Array.isArray(v) && typeof base[k] === 'object' ? deepMerge(base[k], v) : v;
  }
  return out;
}
