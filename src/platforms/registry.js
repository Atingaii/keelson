import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const REGISTRY = require('../../registry/platforms.json');

/** Host discovery registry. Runtime guidance itself always lives under .keelson/. */
export const PLATFORMS = Object.fromEntries(Object.entries(REGISTRY.platforms).map(([id, p]) => [id, { id, ...p }]));
export const PLATFORM_IDS = Object.keys(PLATFORMS);
export const RETIRED_PLATFORM_IDS = ['cursor', 'copilot', 'kilo', 'antigravity', 'devin', 'qoder', 'droid', 'ohmypi', 'reasonix', 'zcode', 'trae', 'grok', 'kimi', 'snow'];

export const CROSS_TOOL = {
  id: 'agents',
  label: 'cross-tool layer',
  instructions: 'AGENTS.md',
  skillsDir: '.agents/skills',
  hooks: false,
};

/** Merge per-project discovery overrides on top of the first-class registry. */
export function platformFor(id, cfg = null) {
  const base = PLATFORMS[id];
  if (!base) return null;
  const over = cfg?.platforms?.[id];
  return over && typeof over === 'object' ? { ...base, ...over } : base;
}

/** Expand selected hosts into unique concrete discovery targets; portable discovery is always present. */
export function installTargets(tools, cfg = null) {
  const targets = [];
  const seen = new Set();
  const push = (t) => {
    const key = `${t.instructions}|${t.skillsDir}|${t.rulesFile ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(t);
  };
  for (const id of tools) {
    const p = platformFor(id, cfg);
    if (!p) throw new Error(`unknown tool "${id}". Known: ${PLATFORM_IDS.join(', ')}`);
    push({ ...p, hooks: Boolean(p.hooks && cfg?.hooks !== false) });
  }
  push(CROSS_TOOL);
  return targets;
}
