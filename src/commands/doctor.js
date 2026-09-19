import path from 'node:path';
import { createRequire } from 'node:module';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { exists, readOr, readJson } from '../lib/fs.js';
import { loadConfig, CONFIG_VERSION } from '../lib/config.js';
import { PLATFORMS, installTargets } from '../platforms/index.js';
import { validateProject } from './validate.js';
import { projectStatus } from './status.js';
import { parseFrontmatter } from '../lib/markdown.js';
import { detectLocal } from '../lib/models.js';
import { knowledgeHealth } from '../lib/health.js';
import { ok, warn, fail, heading, dim } from '../lib/out.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');

export async function doctor({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const findings = [];
  const add = (level, text) => findings.push({ level, text });

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  (nodeMajor >= 20 ? ok : fail)(`node ${process.versions.node}`);
  if (nodeMajor < 20) add('error', 'Node 20 or newer is required');

  const rawVersion = Number((readOr(p.config, '').match(/^version:\s*(\d+)/m) || [])[1] ?? 1);
  if (rawVersion < CONFIG_VERSION) add('warn', `config.yaml is v${rawVersion}; run \`keelson update\` to migrate to v${CONFIG_VERSION}`);

  const canonicalSkill = path.join(p.skill, 'SKILL.md');
  if (!exists(canonicalSkill)) add('error', 'canonical skill missing at .keelson/skill/SKILL.md (run `keelson update`)');
  else {
    const v = parseFrontmatter(readOr(canonicalSkill)).data.version ?? null;
    if (v && v !== PKG_VERSION) add('warn', `canonical skill is ${v}, CLI is ${PKG_VERSION} (run \`keelson update\`)`);
  }
  if (!exists(p.workflow)) add('error', 'canonical workflow missing at .keelson/workflow.md (run `keelson update`)');

  for (const t of cfg.tools ?? []) if (!PLATFORMS[t]) add('error', `unknown tool "${t}" in config.yaml`);
  for (const pl of installTargets((cfg.tools ?? []).filter((t) => PLATFORMS[t]), cfg)) {
    const skill = path.join(root, pl.skillsDir, 'keelson', 'SKILL.md');
    if (!exists(skill)) add('error', `${pl.label}: skill shim missing at ${pl.skillsDir}/keelson (run \`keelson update\`)`);
    else {
      const shimText = readOr(skill);
      const v = parseFrontmatter(shimText).data.version ?? null;
      if (v && v !== PKG_VERSION) add('warn', `${pl.label}: installed shim is ${v}, CLI is ${PKG_VERSION} (run \`keelson update\`)`);
      if (!shimText.includes('.keelson/skill/SKILL.md')) add('error', `${pl.label}: skill entry does not point to .keelson/skill/SKILL.md`);
    }
    const ins = path.join(root, pl.instructions);
    const insText = readOr(ins, '');
    if (pl.instructionsFormat === 'kiro' ? !insText.includes('Keelson') : !insText.includes('<!-- keelson:start -->')) add('error', `${pl.label}: resident block missing from ${pl.instructions}`);
    else if (!insText.includes('.keelson/workflow.md')) add('error', `${pl.label}: resident block does not point to .keelson/workflow.md`);
    if (pl.confidence === 'convention') add('info', `${pl.label}: file locations follow the tool's convention and have not been exercised by the maintainers; if the agent does not pick up the skill, override platforms.${pl.id} in config.yaml`);
    if (pl.hooks) {
      const settings = readJson(path.join(root, '.claude', 'settings.json'), {}) ?? {};
      const has = (ev, script) => (settings.hooks?.[ev] ?? []).some((g) => (g.hooks ?? []).some((h) => String(h.command ?? '').includes(script)));
      if (!has('SessionStart', 'session-start.mjs')) add('warn', `${pl.label}: SessionStart hook not registered (init --no-hooks, or removed); the agent must run \`keelson context\` itself`);
      if (!has('UserPromptSubmit', 'prompt-state.mjs')) add('warn', `${pl.label}: UserPromptSubmit hook not registered`);
      for (const s of ['session-start.mjs', 'prompt-state.mjs']) if (!exists(path.join(p.hooks, s))) add('error', `hook script missing: .keelson/hooks/${s}`);
    }
  }

  const { errors, warnings } = validateProject(root);
  for (const e of errors) add('error', `validate: ${e}`);
  for (const w of warnings) add('warn', `validate: ${w}`);

  const st = projectStatus(root);
  for (const c of st.changes) {
    if (c.verification.state === 'stale') add('warn', `${c.name}: verification is stale (${c.verification.detail})`);
    if (c.handoff?.headMoved) add('warn', `${c.name}: HEAD moved since its handoff; check the worktree before resuming`);
    if (c.blockedBy.length) add('info', `${c.name}: waits on ${c.blockedBy.join(', ')}`);
  }
  for (const k of st.conflicts) add('warn', `shared contract between ${k.a} and ${k.b}: ${[...k.capabilities, ...k.paths].join(', ')}`);

  const health = knowledgeHealth(root, cfg, p);
  for (const h of health) add(h.level, `${h.kind}: ${h.text} → ${h.fix}`);

  const det = detectLocal();
  for (const t of cfg.tools ?? []) if (det.tools[t] && !det.tools[t].installed) add('info', `${PLATFORMS[t]?.label ?? t} CLI not found on PATH (fine if you use it through an IDE)`);

  heading(`keelson doctor — ${path.basename(root)} ${dim(`(keelson ${PKG_VERSION})`)}`);
  if (health.length) console.log(dim('knowledge health: findings are suggestions for small compactions, never automatic rewrites'));
  for (const f of findings) (f.level === 'error' ? fail : f.level === 'warn' ? warn : ok)(f.text);
  const errs = findings.filter((f) => f.level === 'error').length;
  if (!findings.length) ok('everything in place');
  else console.log(`${errs} error${errs === 1 ? '' : 's'}, ${findings.filter((f) => f.level === 'warn').length} warnings`);
  if (flags.json) console.log(JSON.stringify({ ok: !errs, version: PKG_VERSION, findings }, null, 2));
  return errs ? 1 : 0;
}
