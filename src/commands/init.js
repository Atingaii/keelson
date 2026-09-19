import path from 'node:path';
import { projectPaths, findProjectRoot } from '../lib/paths.js';
import { exists, write, read, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../lib/config.js';
import { PLATFORMS, installSkill, installInstructions, installHooks, skillSource } from '../platforms/index.js';
import { list } from '../lib/args.js';
import { ok, info, warn, heading, dim } from '../lib/out.js';
import { detectAndCache } from '../lib/models.js';

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);

export async function init({ flags }, cwd = process.cwd()) {
  const root = path.resolve(flags.dir ?? cwd);
  const existing = findProjectRoot(root);
  if (existing && existing !== root) warn(`a parent directory already has .keelson/ (${existing}); creating a nested one here anyway`);
  const p = projectPaths(root);
  const fresh = !exists(p.keelson);
  const cfg = fresh ? structuredClone(DEFAULT_CONFIG) : loadConfig(p.config);

  const tools = list(flags.tools).length ? list(flags.tools) : cfg.tools?.length ? cfg.tools : ['claude'];
  for (const t of tools) if (!PLATFORMS[t]) throw new Error(`unknown tool "${t}". Known: ${Object.keys(PLATFORMS).join(', ')}`);
  cfg.tools = tools;
  cfg.lang = flags.lang ?? cfg.lang ?? 'en';
  cfg.profile = flags.profile ?? cfg.profile ?? 'lean';
  if (!['lean', 'guided'].includes(cfg.profile)) throw new Error('profile must be lean or guided');

  heading(`Keelson ${fresh ? 'init' : 'update'} in ${root}`);
  const project = path.basename(root);
  const tpl = path.join(skillSource(cfg.lang), 'templates');

  mkdirp(p.keelson);
  const seed = (file, target, vars = {}) => {
    if (exists(target)) return false;
    write(target, fill(read(path.join(tpl, file)), { project, ...vars }));
    return true;
  };
  if (seed('INTENT.md', p.intent)) ok('.keelson/INTENT.md (fill in why the project exists)');
  if (seed('NOW.md', p.now)) ok('.keelson/NOW.md');
  if (seed('rules-index.md', p.rulesIndex)) ok('.keelson/rules/index.md');
  if (seed('rules-general.md', path.join(p.rules, 'general.md'))) ok('.keelson/rules/general.md');
  mkdirp(p.specs);
  mkdirp(p.changes);
  if (!exists(path.join(p.changes, '.gitkeep'))) write(path.join(p.changes, '.gitkeep'), '');
  if (fresh && !cfg.check.length) cfg.check = detectChecks(root);
  saveConfig(p.config, cfg);
  ok('.keelson/config.yaml');

  for (const t of tools) {
    const skillPath = installSkill(root, t, { lang: cfg.lang, profile: cfg.profile });
    ok(`${PLATFORMS[t].label}: skill → ${skillPath}`);
    const files = installInstructions(root, t, { lang: cfg.lang });
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
    console.log(`  1. Edit .keelson/INTENT.md — why this project exists and what it will not do.`);
    console.log(`  2. ${flags.onboard ? 'Ask your agent to run the onboarding described in docs/getting-started.md.' : 'Existing codebase? Re-run with --onboard, or ask your agent: "draft specs and rules from the code".'}`);
    console.log(`  3. Then just talk to your agent. Nothing else to type.`);
  }
  if (flags.onboard) writeOnboardNote(p, project);
  return 0;
}

function detectChecks(root) {
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

function writeOnboardNote(p, project) {
  const now = `# Now

Onboarding ${project}: draft \`.keelson/specs/\` and \`.keelson/rules/\` from the existing code.

## Blocked / uncertain
Specs and rules are drafts until the owner confirms them.

## Next
Read the codebase, list its capabilities, write one spec per capability (present tense, observable behaviour only), then propose rules for the paths that have conventions. Ask the owner to confirm before landing anything.
`;
  write(p.now, now);
  ok('.keelson/NOW.md set to the onboarding task — open your agent and say "continue"');
}
