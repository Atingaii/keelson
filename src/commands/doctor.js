import path from 'node:path';
import { createRequire } from 'node:module';
import { requireProjectRoot, projectPaths, PKG_ROOT } from '../lib/paths.js';
import { exists, readOr, readJson, walk } from '../lib/fs.js';
import { loadConfig, CONFIG_VERSION } from '../lib/config.js';
import { PLATFORMS, installTargets, managedStateMatches, readManagedState, renderSkillFiles, renderSkillShim, residentBlock, workflowContent, sessionAdapterProblems } from '../platforms/index.js';
import { validateProject } from './validate.js';
import { projectStatus } from './status.js';
import { parseFrontmatter } from '../lib/markdown.js';
import { detectLocal } from '../lib/models.js';
import { knowledgeHealth } from '../lib/health.js';
import { listSessionStates } from '../lib/session.js';
import { maintainRuntime } from '../lib/maintenance.js';
import { ok, warn, fail, heading, dim } from '../lib/out.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');

export async function doctor({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  maintainRuntime(root);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const findings = [];
  const add = (level, text) => findings.push({ level, text });

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  (nodeMajor >= 20 ? ok : fail)(`node ${process.versions.node}`);
  if (nodeMajor < 20) add('error', 'Node 20 or newer is required');

  const rawVersion = Number((readOr(p.config, '').match(/^version:\s*(\d+)/m) || [])[1] ?? 1);
  if (rawVersion < CONFIG_VERSION) add('warn', `config.yaml is v${rawVersion}; run \`keelson update\` to migrate to v${CONFIG_VERSION}`);

  const normalize = (text) => String(text ?? '').replace(/\r\n?/g, '\n');
  const expectedSkillFiles = renderSkillFiles(cfg.lang, cfg.profile, PKG_VERSION);
  const expectedSkillPaths = expectedSkillFiles.map((f) => f.rel).sort();
  const actualSkillPaths = walk(p.skill);
  if (JSON.stringify(actualSkillPaths) !== JSON.stringify(expectedSkillPaths)) {
    add('error', 'canonical skill file set drifted from this CLI version (run `keelson update`)');
  }
  for (const file of expectedSkillFiles) {
    const actual = readOr(path.join(p.skill, file.rel), null);
    if (actual !== null && normalize(actual) !== file.content) add('error', `canonical skill drift: .keelson/skill/${file.rel} (run \`keelson update\`)`);
  }
  if (exists(p.workflow) && normalize(readOr(p.workflow)) !== workflowContent(cfg.lang, cfg.guide)) {
    add('error', 'canonical workflow drifted from config/profile (run `keelson update`)');
  }
  for (const suffix of ['.keelson-tmp', '.keelson-bak']) {
    if (exists(p.skill + suffix)) add('warn', `interrupted runtime replacement residue: .keelson/skill${suffix.replace('.keelson', '')} (run \`keelson update\`)`);
  }

  const canonicalSkill = path.join(p.skill, 'SKILL.md');
  if (!exists(canonicalSkill)) add('error', 'canonical skill missing at .keelson/skill/SKILL.md (run `keelson update`)');
  else {
    const v = parseFrontmatter(readOr(canonicalSkill)).data.version ?? null;
    if (v && v !== PKG_VERSION) add('warn', `canonical skill is ${v}, CLI is ${PKG_VERSION} (run \`keelson update\`)`);
  }
  if (!exists(p.workflow)) add('error', 'canonical workflow missing at .keelson/workflow.md (run `keelson update`)');

  for (const t of cfg.tools ?? []) if (!PLATFORMS[t]) add('error', `unknown tool "${t}" in config.yaml`);
  const currentTargets = installTargets((cfg.tools ?? []).filter((t) => PLATFORMS[t]), cfg);
  const managed = readManagedState(root);
  if (!managed) add('warn', 'generated-surface ownership manifest is missing (run `keelson update`)');
  else {
    if (managed.packageVersion && managed.packageVersion !== PKG_VERSION) add('warn', `managed surfaces were last written by Keelson ${managed.packageVersion}; CLI is ${PKG_VERSION}`);
    if (!managedStateMatches(root, currentTargets)) add('error', 'configured tools and generated-surface ownership differ (run `keelson update` to reconcile stale adapters)');
  }
  const expectedBlock = normalize(residentBlock(cfg.lang).trim());
  for (const pl of currentTargets) {
    const skill = path.join(root, pl.skillsDir, 'keelson', 'SKILL.md');
    if (!exists(skill)) add('error', `${pl.label}: skill shim missing at ${pl.skillsDir}/keelson (run \`keelson update\`)`);
    else {
      const shimText = readOr(skill);
      const v = parseFrontmatter(shimText).data.version ?? null;
      if (v && v !== PKG_VERSION) add('warn', `${pl.label}: installed shim is ${v}, CLI is ${PKG_VERSION} (run \`keelson update\`)`);
      if (normalize(shimText) !== renderSkillShim(cfg.lang, PKG_VERSION)) add('error', `${pl.label}: skill discovery shim drifted (run \`keelson update\`)`);
    }
    const ins = path.join(root, pl.instructions);
    const insText = readOr(ins, '');
    if (pl.instructionsFormat === 'kiro' ? !insText.includes('Keelson') : !insText.includes('<!-- keelson:start -->')) add('error', `${pl.label}: discovery block missing from ${pl.instructions}`);
    else if (pl.instructionsFormat !== 'kiro') {
      const found = normalize(insText).match(/<!-- keelson:start -->[\s\S]*?<!-- keelson:end -->/)?.[0] ?? '';
      if (found.trim() !== expectedBlock) add('error', `${pl.label}: discovery block drifted in ${pl.instructions} (run \`keelson update\`)`);
    }
    if (pl.rulesFile) {
      const rules = path.join(root, pl.rulesFile);
      if (!exists(rules)) add('error', `${pl.label}: discovery rules file missing at ${pl.rulesFile} (run \`keelson update\`)`);
      else if (!readOr(rules).includes('.keelson/workflow.md')) add('error', `${pl.label}: discovery rules file does not point to .keelson/workflow.md`);
    }
    if (pl.confidence === 'convention') add('info', `${pl.label}: file locations follow the tool's convention and have not been exercised by the maintainers; if the agent does not pick up the skill, override platforms.${pl.id} in config.yaml`);
    for (const problem of sessionAdapterProblems(root, pl)) add('error', `${problem} (run \`keelson update\`)`);
    if (pl.hooks) {
      const settings = readJson(path.join(root, '.claude', 'settings.json'), {}) ?? {};
      const has = (ev, script) => (settings.hooks?.[ev] ?? []).some((g) => (g.hooks ?? []).some((h) => String(h.command ?? '').includes(script)));
      const registrations = [
        ['SessionStart', 'session-start.mjs'],
        ['UserPromptSubmit', 'prompt-state.mjs'],
      ];
      for (const [event, script] of registrations) {
        const registered = has(event, script);
        if (!registered) {
          add('warn', `${pl.label}: ${event} hook not registered (fine after init --no-hooks; the agent falls back to the discovery workflow)`);
          continue;
        }
        const installed = path.join(p.hooks, script);
        if (!exists(installed)) add('error', `registered hook script missing: .keelson/hooks/${script}`);
        else if (normalize(readOr(installed)) !== normalize(readOr(path.join(PKG_ROOT, 'hooks', script)))) add('error', `registered hook script drifted: .keelson/hooks/${script} (run \`keelson update\`)`);
      }
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

  const activeNames = new Set(st.changes.map((c) => c.name));
  for (const session of listSessionStates(root)) {
    if (session.change && !activeNames.has(session.change)) add('warn', `stale session focus points to missing change "${session.change}" under .keelson/.runtime/sessions/`);
  }

  const health = knowledgeHealth(root, cfg, p);
  // Critical budget findings already arrive through validateProject; add the
  // advisory health findings here without duplicating hard-limit errors.
  for (const h of health) if (h.level !== 'error') add(h.level, `${h.kind}: ${h.text} → ${h.fix}`);

  const det = detectLocal();
  for (const t of cfg.tools ?? []) if (det.tools[t] && !det.tools[t].installed) add('info', `${PLATFORMS[t]?.label ?? t} CLI not found on PATH (fine if you use it through an IDE)`);

  heading(`keelson doctor — ${path.basename(root)} ${dim(`(keelson ${PKG_VERSION})`)}`);
  if (health.length) console.log(dim('knowledge health: structural maintenance is automatic; remaining findings are internal Agent reconciliation signals unless semantics require owner input'));
  for (const f of findings) (f.level === 'error' ? fail : f.level === 'warn' ? warn : ok)(f.text);
  const errs = findings.filter((f) => f.level === 'error').length;
  if (!findings.length) ok('everything in place');
  else console.log(`${errs} error${errs === 1 ? '' : 's'}, ${findings.filter((f) => f.level === 'warn').length} warnings`);
  if (flags.json) console.log(JSON.stringify({ ok: !errs, version: PKG_VERSION, findings }, null, 2));
  return errs ? 1 : 0;
}
