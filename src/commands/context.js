import path from 'node:path';
import { activeWorkflow, phaseContext, renderPhaseContext } from '../lib/workflow.js';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { readOr, listDirs, exists } from '../lib/fs.js';
import { loadConfig } from '../lib/config.js';
import { matchRules } from '../lib/rules.js';
import { loadAllChanges } from '../lib/changes.js';
import { evaluateLifecycle } from '../lib/lifecycle.js';
import { readSession } from '../lib/session.js';
import { gitStatusShort, recentCommits, worktreeFingerprint } from '../lib/git.js';
import { list } from '../lib/args.js';
import { knowledgeHealth } from '../lib/health.js';
import { maintainRuntime } from '../lib/maintenance.js';
import { changeSpecDrift } from '../lib/specs.js';

export async function context({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  if (flags.phase) {
    const workflow = activeWorkflow(root, flags.change);
    const pack = phaseContext(root, workflow, flags.phase, [...list(flags.paths), ...positional]);
    console.log(flags.json ? JSON.stringify(pack, null, 2) : renderPhaseContext(pack));
    return 0;
  }
  maintainRuntime(root);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const paths = [...list(flags.paths), ...positional].map((x) => path.relative(root, path.resolve(root, x)).replace(/\\/g, '/'));
  const rules = matchRules(p.rules, paths);
  const fp = worktreeFingerprint(root);
  const changes = loadAllChanges(p.changes);
  const session = readSession(root);
  const focus = session.state?.change && changes.some((c) => c.name === session.state.change) ? session.state.change : null;
  const activeNames = new Set(changes.map((c) => c.name));
  const orderedChanges = focus ? [...changes].sort((a, b) => (a.name === focus ? -1 : b.name === focus ? 1 : 0)) : changes;
  const specs = listDirs(p.specs);
  const refs = Object.entries(cfg.refs ?? {}).filter(([, v]) => v);
  const knowledgeFindings = knowledgeHealth(root, cfg, p);
  const data = {
    root,
    intent: readOr(p.intent).trim(),
    now: readOr(p.now).trim(),
    roadmap: exists(p.roadmap) ? readOr(p.roadmap).trim() : '',
    glossary: exists(p.glossary) && !/^- …/m.test(readOr(p.glossary)) ? readOr(p.glossary).trim() : '',
    guide: Boolean(cfg.guide),
    context: cfg.context?.trim() ?? '',
    refs: Object.fromEntries(refs),
    paths,
    rules: rules.map((r) => ({ file: `.keelson/rules/${r.file}`, globs: r.globs, content: r.content.trim(), missing: !r.exists })),
    specs: specs.map((s) => `${p.specsRel}/${s}/spec.md`),
    focus,
    sessionAvailable: session.available,
    knowledge: {
      critical: knowledgeFindings.filter((h) => h.level === 'error').length,
      overBudget: knowledgeFindings.filter((h) => h.level === 'warn').length,
      maintenance: knowledgeFindings.slice(0, 8).map((h) => ({ level: h.level, kind: h.kind, text: h.text, fix: h.fix })),
    },
    changes: orderedChanges.map((c) => {
      const contractDrift = changeSpecDrift(c, p.specs);
      const lifecycle = evaluateLifecycle(c, fp, { activeNames, contractDrift });
      return { name: c.name, tier: c.tier, owner: c.owner, work: lifecycle.work, verification: lifecycle.verification.state, blockedBy: lifecycle.blockedBy, progress: c.progress, open: c.open.map((o) => o.text), handoffNext: c.handoff?.next ?? null };
    }),
    git: { dirty: gitStatusShort(root), recent: recentCommits(root, 5) },
  };
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
    return 0;
  }
  const out = [`# Keelson context — ${path.basename(root)}`, ''];
  if (data.context) out.push('## Project context (config.yaml)', '', data.context, '');
  out.push('## INTENT.md', '', data.intent || '(empty — fill in .keelson/INTENT.md)', '');
  if (data.roadmap) out.push('## ROADMAP.md', '', data.roadmap, '');
  if (data.glossary) out.push('## GLOSSARY.md', '', data.glossary, '');
  if (data.guide) out.push('Guided mode is on: keep normal accessible questioning, and add concise teaching about the engineering ideas and constraint rationale behind settled decisions.', '');
  out.push('## NOW.md', '', data.now || '(empty)', '');
  if (data.knowledge.maintenance.length) {
    out.push('## Internal knowledge maintenance', '');
    out.push('Handle these automatically during RECONCILE; do not ask the owner to run maintenance or report budget mechanics unless a semantic product decision is required.');
    for (const item of data.knowledge.maintenance.slice(0, 8)) out.push(`- ${item.text} → ${item.fix}`);
    out.push('');
  }
  if (refs.length) out.push('## Existing project material (read, do not duplicate)', '', ...refs.map(([k, v]) => `- ${k}: ${v}`), '');
  out.push(`## Active changes${data.focus ? ` (session focus: ${data.focus})` : ''}`, '');
  if (!data.changes.length) out.push('none');
  for (const c of data.changes) {
    out.push(`- ${c.name} · ${c.tier} · work ${c.work} · verify ${c.verification} · ${c.progress.done}/${c.progress.total} tasks${c.owner ? ` · ${c.owner}` : ''}`);
    if (c.blockedBy?.length) out.push(`  depends on active: ${c.blockedBy.join(', ')}`);
    if (c.open.length) out.push(`  open: ${c.open.join('; ')}`);
    if (c.handoffNext) out.push(`  handoff next: ${c.handoffNext.split('\n')[0]}`);
  }
  out.push('');
  out.push(`## Capabilities with specs (${p.specsRel})`, '', specs.length ? specs.map((s) => `- ${s}`).join('\n') : 'none yet', '');
  out.push(`## Rules matched${paths.length ? ` for ${paths.join(', ')}` : ' (always-on only; pass --paths to route)'}`, '');
  if (!rules.length) out.push('none');
  for (const r of rules) {
    out.push(`### .keelson/rules/${r.file}  (${r.globs.join(', ')})`, '');
    out.push(r.exists ? r.content.trim() : '(file missing — referenced in index.md but not found)', '');
  }
  if (paths.length) out.push('Path routing is navigation, not proof: run `keelson impact <files>` for callers and affected specs, then check other entry points by reading.', '');
  if (data.git.dirty?.length) out.push('## Uncommitted', '', ...data.git.dirty.slice(0, 20).map((l) => `- ${l}`), '');
  console.log(out.join('\n'));
  return 0;
}
