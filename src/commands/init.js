import path from 'node:path';
import { createRequire } from 'node:module';
import { projectPaths, findProjectRoot } from '../lib/paths.js';
import { exists, write, read, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG, CONFIG_VERSION } from '../lib/config.js';
import { PLATFORMS, installSkill, installInstructions, installHooks, skillSource, plannedSkillFiles } from '../platforms/index.js';
import { list } from '../lib/args.js';
import { ok, info, warn, heading, dim } from '../lib/out.js';
import { detectAndCache } from '../lib/models.js';
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

  const tools = list(flags.tools).length ? list(flags.tools) : cfg.tools?.length ? cfg.tools : ['claude'];
  for (const t of tools) if (!PLATFORMS[t]) throw new Error(`unknown tool "${t}". Known: ${Object.keys(PLATFORMS).join(', ')}`);
  cfg.tools = tools;
  cfg.lang = flags.lang ?? cfg.lang ?? 'en';
  cfg.profile = flags.profile ?? cfg.profile ?? 'lean';
  if (flags.guide !== undefined) cfg.guide = flags.guide !== 'false' && flags.guide !== false;
  if (!['lean', 'guided'].includes(cfg.profile)) throw new Error('profile must be lean or guided');

  const project = path.basename(root);
  const tpl = path.join(skillSource(cfg.lang), 'templates');

  if (flags.dryRun) {
    heading(`Keelson ${fresh ? 'init' : 'update'} (dry run) in ${root}`);
    for (const t of tools) {
      for (const f of plannedSkillFiles(root, t, { lang: cfg.lang, profile: cfg.profile })) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
      const ins = path.join(root, PLATFORMS[t].instructions);
      console.log(`  ${(exists(ins) ? (read(ins).includes('<!-- keelson:start -->') ? 'refresh' : 'append') : 'create').padEnd(9)} ${PLATFORMS[t].instructions}`);
    }
    if (rawVersion < CONFIG_VERSION) console.log(`  migrate   .keelson/config.yaml v${rawVersion} → v${CONFIG_VERSION}`);
    console.log(dim('nothing written'));
    return 0;
  }

  heading(`Keelson ${fresh ? 'init' : 'update'} in ${root}`);
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
  const seed = (file, target, vars = {}) => {
    if (exists(target)) return false;
    write(target, fill(read(path.join(tpl, file)), { project, ...vars }));
    return true;
  };
  if (seed('INTENT.md', p.intent)) ok('.keelson/INTENT.md (fill in why the project exists and what the agent may decide alone)');
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

  for (const t of tools) {
    const skillPath = installSkill(root, t, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION });
    ok(`${PLATFORMS[t].label}: skill → ${skillPath}`);
    const files = installInstructions(root, t, { lang: cfg.lang, guide: cfg.guide });
    ok(`${PLATFORMS[t].label}: resident block → ${files.join(', ')}`);
    if (PLATFORMS[t].hooks && !flags.noHooks) {
      installHooks(root);
      ok(`${PLATFORMS[t].label}: hooks → .claude/settings.json (session snapshot + per-prompt state line)`);
    }
  }

  try {
    detectAndCache();
    info(`model detection cached in ~/.keelson/models.cache.json ${dim('(keelson models)')}`);
  } catch (e) {
    warn(`model detection skipped: ${e.message}`);
  }

  console.log('');
  if (fresh) {
    heading('Next');
    console.log('  1. Edit .keelson/INTENT.md — why this project exists, what it will not do, what the agent may decide alone.');
    console.log(`  2. ${flags.onboard ? 'Open your agent and say "continue": NOW.md holds the onboarding task.' : 'Existing codebase? Re-run with --onboard, or ask your agent: "draft specs and rules from the code".'}`);
    console.log('  3. Then just talk to your agent. Nothing else to type.');
  }
  if (flags.onboard) writeOnboardNote(p, project, cfg);
  return 0;
}

function writeOnboardNote(p, project, cfg) {
  const refs = Object.entries(cfg.refs ?? {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  write(
    p.now,
    `# Now

Onboarding ${project}: draft \`${cfg.paths.specs}/\` and \`.keelson/rules/\` from the existing code${refs.length ? `, reusing what already exists (${refs.join(', ')})` : ''}.

## Blocked / uncertain
Specs and rules are drafts until the owner confirms them. Existing documents are referenced, never copied.

## Next
Read the codebase, list its capabilities, write one spec per capability (present tense, observable behaviour only), then propose rules for the paths that have conventions. Where a document already describes a contract or a decision, link to it from the spec instead of restating it. Ask the owner to confirm before landing anything.
`,
  );
  ok('.keelson/NOW.md set to the onboarding task — open your agent and say "continue"');
}
