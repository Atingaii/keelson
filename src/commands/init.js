import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { projectPaths, findProjectRoot } from '../lib/paths.js';
import { exists, write, read, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG, CONFIG_VERSION } from '../lib/config.js';
import { PLATFORMS, PLATFORM_IDS, installTargets, installCanonicalSkill, installSkill, installWorkflow, installInstructions, installHooks, skillSource, plannedCanonicalSkillFiles, plannedSkillFiles, plannedWorkflowFile, plannedManagedRemovals, reconcileManagedTargets, writeManagedState } from '../platforms/index.js';
import { list } from '../lib/args.js';
import { ok, info, warn, heading, dim } from '../lib/out.js';
import { detectAndCache, detectLocal } from '../lib/models.js';
import { git, isGitRepo } from '../lib/git.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../../package.json');
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

/** Existing project material Keelson should reference instead of duplicating. */
export function detectRefs(root) {
  const first = (cands) => cands.find((c) => exists(path.join(root, c))) ?? null;
  const refs = {
    architecture: first(['ARCHITECTURE.md', 'docs/architecture', 'docs/architecture.md', 'docs/ARCHITECTURE.md', 'doc/architecture']),
    decisions: first(['docs/adr', 'docs/decisions', 'doc/adr', 'adr', 'decisions', 'docs/ADR']),
    tasks: null,
    ci: first(['.github/workflows', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci', 'azure-pipelines.yml']),
  };
  if (isGitRepo(root)) {
    const remote = git(root, ['remote', 'get-url', 'origin']);
    const m = remote?.match(/github\.com[:/]([^/]+\/[^/.]+)/);
    if (m) refs.tasks = `https://github.com/${m[1]}/issues`;
  }
  const specs = first(['docs/specs', 'docs/contracts', 'specs', 'spec']);
  return { refs, specsCandidate: specs };
}

export function detectChecks(root) {
  const pkg = readOr(path.join(root, 'package.json'), '');
  const checks = [];
  if (pkg) {
    try {
      const scripts = JSON.parse(pkg).scripts ?? {};
      for (const s of ['lint', 'typecheck', 'type-check', 'test']) if (scripts[s]) checks.push(`npm run ${s}`);
    } catch {}
  }
  if (exists(path.join(root, 'pyproject.toml')) || exists(path.join(root, 'pytest.ini'))) checks.push('pytest -q');
  if (exists(path.join(root, 'go.mod'))) checks.push('go vet ./...', 'go test ./...');
  if (exists(path.join(root, 'Cargo.toml'))) checks.push('cargo test');
  return checks;
}

export function ensureGitignore(root) {
  const gi = path.join(root, '.gitignore');
  const cur = readOr(gi, '');
  if (/^\.keelson\/\.local\/?$/m.test(cur)) return false;
  write(gi, `${cur.replace(/\n*$/, cur ? '\n' : '')}# Keelson: per-machine session state and check evidence\n.keelson/.local/\n`);
  return true;
}

export async function init({ flags }, cwd = process.cwd()) {
  const root = path.resolve(flags.dir ?? cwd);
  const existing = findProjectRoot(root);
  if (existing && existing !== root) warn(`a parent directory already has .keelson/ (${existing}); creating a nested one here anyway`);
  const fresh = !exists(path.join(root, '.keelson', 'config.yaml')) && !exists(path.join(root, '.keelson', 'INTENT.md'));
  const cfgPath = path.join(root, '.keelson', 'config.yaml');
  const rawVersion = fresh ? CONFIG_VERSION : Number((readOr(cfgPath, '').match(/^version:\s*(\d+)/m) || [])[1] ?? 1);
  const cfg = fresh ? structuredClone(DEFAULT_CONFIG) : loadConfig(cfgPath);

  // Tools: --tools a,b · or one flag per platform (--claude --cursor …) · or config · or auto-detect from the machine · or claude.
  const flagged = PLATFORM_IDS.filter((id) => flags[id] === true);
  let tools = list(flags.tools).length ? list(flags.tools) : flagged.length ? flagged : cfg.tools?.length && !fresh ? cfg.tools : [];
  let detectedTools = false;
  if (!tools.length) {
    const det = detectLocal().tools;
    tools = PLATFORM_IDS.filter((id) => det[id]?.installed);
    detectedTools = tools.length > 0;
    if (!tools.length) tools = ['claude'];
  }
  for (const t of tools) if (!PLATFORMS[t]) throw new Error(`unknown tool "${t}". Known: ${PLATFORM_IDS.join(', ')}`);
  cfg.tools = [...new Set(tools)];
  const targets = installTargets(cfg.tools, cfg);
  cfg.lang = flags.lang ?? cfg.lang ?? 'en';
  cfg.profile = flags.profile ?? cfg.profile ?? 'lean';
  if (flags.guide !== undefined) cfg.guide = flags.guide !== 'false' && flags.guide !== false;
  if (!['lean', 'guided'].includes(cfg.profile)) throw new Error('profile must be lean or guided');

  const project = path.basename(root);
  const tpl = path.join(skillSource(cfg.lang), 'templates');
  const projectMap = fill(read(path.join(tpl, 'README.md')), { project });

  if (flags.dryRun) {
    heading(`Keelson ${fresh ? 'init' : 'update'} (dry run) in ${root}`);
    const mapPath = path.join(root, '.keelson', 'README.md');
    console.log(`  ${(!exists(mapPath) ? 'create' : read(mapPath) === projectMap ? 'unchanged' : 'update').padEnd(9)} .keelson/README.md`);
    const workflow = plannedWorkflowFile(root, { lang: cfg.lang, guide: cfg.guide });
    console.log(`  ${workflow.status.padEnd(9)} ${workflow.path}`);
    for (const f of plannedCanonicalSkillFiles(root, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION })) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
    for (const rel of plannedManagedRemovals(root, targets)) console.log(`  ${'remove'.padEnd(9)} ${rel} (stale managed surface)`);
    for (const t of targets) {
      for (const f of plannedSkillFiles(root, t, { lang: cfg.lang, version: PKG_VERSION })) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
      const ins = path.join(root, t.instructions);
      console.log(`  ${(exists(ins) ? (read(ins).includes('<!-- keelson:start -->') ? 'refresh' : 'append') : 'create').padEnd(9)} ${t.instructions}`);
    }
    if (rawVersion < CONFIG_VERSION) console.log(`  migrate   .keelson/config.yaml v${rawVersion} → v${CONFIG_VERSION}`);
    console.log(dim('nothing written'));
    return 0;
  }

  heading(`Keelson ${fresh ? 'init' : 'update'} in ${root}`);
  if (detectedTools) info(`tools detected on this machine: ${cfg.tools.map((t) => PLATFORMS[t].label).join(', ')} (override with --tools or --<platform>)`);
  const p0 = projectPaths(root, cfg);
  mkdirp(p0.keelson);
  if (fresh) {
    const det = detectRefs(root);
    cfg.refs = { ...cfg.refs, ...Object.fromEntries(Object.entries(det.refs).filter(([, v]) => v)) };
    if (det.specsCandidate && !exists(p0.specs)) info(`found ${det.specsCandidate}/ — if it holds behaviour contracts, set paths.specs to it in config.yaml`);
    for (const [k, v] of Object.entries(det.refs)) if (v) ok(`referencing existing ${k}: ${v}`);
    if (!cfg.check.length) cfg.check = detectChecks(root);
  }
  const p = projectPaths(root, cfg);
  const mapState = !exists(p.readme) ? 'created' : read(p.readme) === projectMap ? null : 'refreshed';
  if (mapState) {
    write(p.readme, projectMap);
    ok(`.keelson/README.md (human project map; ${mapState} by Keelson)`);
  }
  const seed = (file, target, vars = {}) => {
    if (exists(target)) return false;
    write(target, fill(read(path.join(tpl, file)), { project, ...vars }));
    return true;
  };
  if (seed('INTENT.md', p.intent)) ok('.keelson/INTENT.md (the agent drafts it from the code on first contact; confirm it when it asks)');
  if (seed('NOW.md', p.now)) ok('.keelson/NOW.md');
  if (seed('ROADMAP.md', p.roadmap)) ok('.keelson/ROADMAP.md (current milestone; link your tracker instead of duplicating it)');
  if (seed('GLOSSARY.md', p.glossary)) ok('.keelson/GLOSSARY.md (shared vocabulary; fill it when two words start meaning the same thing)');
  if (seed('rules-index.md', p.rulesIndex)) ok('.keelson/rules/index.md');
  if (seed('rules-general.md', path.join(p.rules, 'general.md'))) ok('.keelson/rules/general.md');
  mkdirp(p.specs);
  mkdirp(p.changes);
  if (!exists(path.join(p.changes, '.gitkeep'))) write(path.join(p.changes, '.gitkeep'), '');
  if (ensureGitignore(root)) ok('.gitignore: .keelson/.local/ (session state and evidence stay on this machine)');
  saveConfig(p.config, cfg);
  ok(`.keelson/config.yaml${rawVersion < CONFIG_VERSION ? ` (migrated v${rawVersion} → v${CONFIG_VERSION})` : ''}`);

  for (const rel of reconcileManagedTargets(root, targets)) ok(`removed stale managed surface → ${rel}`);

  const workflowPath = installWorkflow(root, { lang: cfg.lang, guide: cfg.guide });
  const canonicalSkillPath = installCanonicalSkill(root, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION });
  ok(`canonical runtime → ${workflowPath}; ${canonicalSkillPath}`);

  for (const t of targets) {
    const skillPath = installSkill(root, t, { lang: cfg.lang, version: PKG_VERSION });
    const files = installInstructions(root, t, { lang: cfg.lang });
    ok(`${t.label}: discovery shim → ${skillPath}; instructions → ${files.join(', ')}${t.confidence === 'convention' ? dim(' (path by convention; run `keelson doctor` after your first session)') : ''}`);
    if (t.hooks && !flags.noHooks) {
      installHooks(root);
      ok(`${t.label}: hooks → .claude/settings.json (session snapshot + per-prompt state line)`);
    }
  }
  writeManagedState(root, targets, PKG_VERSION);
  ok('.keelson/.managed.json (generated-surface ownership)');

  try {
    detectAndCache();
    info(`model detection cached in ~/.keelson/models.cache.json ${dim('(keelson models)')}`);
  } catch (e) {
    warn(`model detection skipped: ${e.message}`);
  }

  // A fresh project always starts with the onboarding note: the agent drafts INTENT (and specs and rules for an existing
  // codebase) from what it finds, and asks the owner to confirm. Nothing is a chore for the user.
  if (fresh || flags.onboard) writeOnboardNote(p, project, cfg, hasCode(root));

  console.log('');
  if (fresh) {
    heading('Done. Open your agent in this directory and start talking.');
    console.log(dim('  On first contact it reads the repository, drafts .keelson/INTENT.md' + (hasCode(root) ? ', the specs, and the rules' : '') + ', and asks you to confirm before anything lands.'));
  }
  return 0;
}

function hasCode(root) {
  const skip = new Set(['.git', '.keelson', 'node_modules', '.claude', '.agents', '.cursor', '.github', 'docs', 'dist', 'build']);
  const visit = (d, depth) => {
    if (depth > 3) return false;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (skip.has(e.name) || e.name.startsWith('.')) continue;
      if (e.isFile() && /\.(m?js|cjs|ts|tsx|jsx|py|go|rs|rb|java|kt|swift|cs|php|c|cc|cpp|h|hpp|scala|ex|exs|clj|vue|svelte)$/.test(e.name)) return true;
      if (e.isDirectory() && visit(path.join(d, e.name), depth + 1)) return true;
    }
    return false;
  };
  try {
    return visit(root, 0);
  } catch {
    return false;
  }
}

function writeOnboardNote(p, project, cfg, existingCode) {
  const refs = Object.entries(cfg.refs ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  const intent = `Draft \`.keelson/INTENT.md\` from what the repository shows (README, package manifest, directory layout${existingCode ? ', the code' : ''}): why it exists, its boundaries, hard constraints, and a first Authorizations section. Ask the owner to confirm or correct it in one short exchange; keep their answers, drop your guesses.`;
  const specs = existingCode
    ? ` Then list the capabilities the code already has, write one spec per capability (present tense, observable behaviour only) under \`${cfg.paths.specs}/\`, and propose rules for the paths that have conventions. Where a document already describes a contract or a decision, link to it from the spec instead of restating it.`
    : '';
  write(
    p.now,
    `# Now

First contact with ${project}: Keelson was just initialised and nothing has been drafted yet.

## Blocked / uncertain
INTENT.md${existingCode ? ', the specs, and the rules' : ''} are drafts until the owner confirms them. Existing documents${refs.length ? ` (${refs.join(', ')})` : ''} are referenced, never copied.

## Next
${intent}${specs} Do this before, or as part of, the first thing the owner asks for; if they ask for a change right away, draft INTENT from what you learn while shaping that change and confirm both together. Then rewrite this file.
`,
  );
  ok(`.keelson/NOW.md: first-contact task written for the agent${existingCode ? ' (draft INTENT, specs, and rules from the code)' : ' (draft INTENT)'}`);
}
