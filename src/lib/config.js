import YAML from 'yaml';
import { readOr, write } from './fs.js';

export const CONFIG_VERSION = 4;

export const DEFAULT_CONFIG = {
  version: CONFIG_VERSION,
  tools: ['agents'],
  lang: 'en',
  profile: 'lean',
  default_tier: 'auto',
  confirm: { quick: 'proceed', spec: 'wait' },
  land: 'fold',
  check: [],
  guide: false,
  hooks: true,
  budgets: { INTENT: 120, ROADMAP: 80, NOW: 60, GLOSSARY: 200, spec: 250, rule: 120, change: 200, handoff: 100, 'always-on': 300 },
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
  if (fromVersion < 3) {
    out.budgets = { ...DEFAULT_CONFIG.budgets, ...(out.budgets ?? {}) };
    out.guide = Boolean(out.guide);
  }
  if (fromVersion < 4) {
    out.hooks = out.hooks !== false;
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
    '# check: commands (strings, or {name, command, kind}) that prove the code works. guide: learning mode. hooks: persist host hook installation.',
    '# budgets: line budgets per document type; `keelson doctor` asks for a compaction when one is exceeded.',
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

/** Normalise `check:` entries: a string, or {name, command, kind}. */
export function checkEntries(cfg) {
  return (cfg.check ?? []).map((c, i) => {
    if (typeof c === 'string') return { name: c, command: c, kind: guessKind(c) };
    const command = c.command ?? c.cmd ?? '';
    return { name: c.name ?? command ?? `check-${i + 1}`, command, kind: c.kind ?? guessKind(command) };
  }).filter((c) => c.command);
}

function guessKind(cmd) {
  const c = String(cmd).toLowerCase();
  if (/lint|eslint|ruff|clippy|vet|fmt/.test(c)) return 'lint';
  if (/tsc|typecheck|type-check|mypy|pyright/.test(c)) return 'typecheck';
  if (/build|compile/.test(c)) return 'build';
  if (/architecture|arch|depend|boundary|compat|contract/.test(c)) return 'fitness';
  if (/test|spec|pytest|jest|vitest|mocha/.test(c)) return 'test';
  return 'check';
}
