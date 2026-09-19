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
  const portableConfigured = Boolean(root && exists(path.join(root, '.keelson', 'workflow.md')) && exists(path.join(root, '.keelson', 'skill', 'SKILL.md')) && exists(path.join(root, 'AGENTS.md')) && exists(path.join(root, '.agents', 'skills', 'keelson', 'SKILL.md')));
  const rows = PLATFORM_IDS.map((id) => {
    const p = PLATFORMS[id];
    return { id, label: p.label, support: p.support ?? 'first-class', instructions: p.instructions, skills: p.skillsDir, skillDiscovery: p.skillsDir, rules: p.rulesFile ?? null, hooks: p.hooks, confidence: p.confidence, examples: p.examples ?? null, installed: det[id]?.installed ?? null, configured: id === 'agents' ? portableConfigured : cfg?.tools?.includes(id) ?? false };
  });
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return 0;
  }
  heading(`Keelson platforms (${rows.length})`);
  console.log(dim('support: first-class = explicit tested adapter contract · portable = standards fallback; confidence: verified = exercised · documented = host docs'));
  console.log('');
  const w = Math.max(...rows.map((r) => r.label.length));
  for (const r of rows) {
    const marks = [r.configured ? 'configured' : null, r.installed ? 'on this machine' : null].filter(Boolean).join(', ');
    console.log(`  --${r.id.padEnd(12)} ${r.label.padEnd(w)}  ${r.instructions.padEnd(16)} ${r.skillDiscovery.padEnd(20)} ${(r.support ?? '').padEnd(11)} ${r.hooks ? 'hooks ' : '      '} ${dim(r.confidence)}${marks ? dim(`  [${marks}]`) : ''}`);
  }
  console.log('');
  console.log(dim('canonical runtime: .keelson/workflow.md + .keelson/skill/ · portable discovery: AGENTS.md + .agents/skills/'));
  return 0;
}
