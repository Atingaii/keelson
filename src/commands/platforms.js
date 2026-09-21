import path from 'node:path';
import { PLATFORMS, PLATFORM_IDS } from '../platforms/index.js';
import { detectLocal } from '../lib/models.js';
import { findProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig } from '../lib/config.js';
import { exists } from '../lib/fs.js';
import { heading, dim } from '../lib/out.js';

export async function platforms({ flags }, cwd = process.cwd()) {
  const root = findProjectRoot(cwd);
  const cfg = root ? loadConfig(projectPaths(root).config) : null;
  const det = detectLocal().tools;
  const portableConfigured = Boolean(root && cfg?.tools?.includes('agents') && exists(path.join(root, 'AGENTS.md')) && exists(path.join(root, '.agents', 'skills', 'keelson', 'SKILL.md')));
  const rows = PLATFORM_IDS.map((id) => {
    const p = PLATFORMS[id];
    const configured = id === 'agents' ? portableConfigured : cfg?.tools?.includes(id) ?? false;
    const sessionFocus = p.sessionFocus ?? 'degraded';
    const effectiveSessionFocus =
      configured && cfg?.hooks === false && p.sessionAdapter && !['pi-env', 'codex-thread-env'].includes(p.sessionAdapter)
        ? 'degraded'
        : sessionFocus;
    return { id, label: p.label, support: p.support ?? 'first-class', sessionFocus, effectiveSessionFocus, instructions: p.instructions, skills: p.skillsDir, skillDiscovery: p.skillsDir, rules: p.rulesFile ?? null, hooks: p.hooks, confidence: p.confidence, examples: p.examples ?? null, installed: det[id]?.installed ?? null, configured };
  });
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }
  heading(`Keelson platforms (${rows.length})`);
  console.log(dim('support: first-class = tested discovery/lifecycle contract · portable = standards fallback; sessionFocus shows effective project behavior (native|degraded)'));
  console.log('');
  const w = Math.max(...rows.map((r) => r.label.length));
  for (const r of rows) {
    const marks = [r.configured ? 'configured' : null, r.installed ? 'on this machine' : null].filter(Boolean).join(', ');
    console.log(`  --${r.id.padEnd(12)} ${r.label.padEnd(w)}  ${r.instructions.padEnd(16)} ${r.skillDiscovery.padEnd(20)} ${(r.support ?? '').padEnd(11)} ${(r.effectiveSessionFocus ?? r.sessionFocus ?? 'degraded').padEnd(9)} ${r.hooks ? 'hooks ' : '      '} ${dim(r.confidence)}${marks ? dim(`  [${marks}]`) : ''}`);
  }
  console.log('');
  console.log(dim('guidance stays in the installed package by default; use `keelson guide` or opt in to `keelson init --vendor` for a project copy'));
  return 0;
}
