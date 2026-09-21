import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { projectPaths, findProjectRoot } from '../lib/paths.js';
import { exists, write, read, mkdirp, readOr } from '../lib/fs.js';
import { loadConfig, saveConfig, DEFAULT_CONFIG, CONFIG_VERSION } from '../lib/config.js';
import { PLATFORMS, PLATFORM_IDS, RETIRED_PLATFORM_IDS, installTargets, installCanonicalSkill, installSkill, installWorkflow, installInstructions, installHooks, installSessionAdapter, skillSource, plannedCanonicalSkillFiles, plannedSkillFiles, plannedWorkflowFile, plannedManagedRemovals, plannedSessionAdapterFiles, readManagedState, reconcileManagedTargets, removeCanonicalRuntime, removeLegacyCopiedHooks, writeManagedState, assertSkillsInstallable, assertCanonicalSkillInstallable, assertWorkflowInstallable } from '../platforms/index.js';
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

export function chooseDetectedTools(detected = {}) {
  const installed = PLATFORM_IDS.filter((id) => detected[id]?.installed);
  const reliable = installed.filter((id) => PLATFORMS[id]?.confidence !== 'convention');
  const conventionDetected = installed.filter((id) => PLATFORMS[id]?.confidence === 'convention');
  return reliable.length
    ? { tools: reliable, conventionDetected, portableFallback: false }
    : { tools: ['agents'], conventionDetected, portableFallback: true };
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

export async function init({ flags }, cwd = process.cwd()) {
  const root = path.resolve(flags.dir ?? cwd);
  const existing = findProjectRoot(root);
  if (existing && existing !== root) warn(`a parent directory already has .keelson/ (${existing}); creating a nested one here anyway`);
  const fresh = !exists(path.join(root, '.keelson', 'config.yaml')) && !exists(path.join(root, '.keelson', 'INTENT.md'));
  const cfgPath = path.join(root, '.keelson', 'config.yaml');
  const rawVersion = fresh ? CONFIG_VERSION : Number((readOr(cfgPath, '').match(/^version:\s*(\d+)/m) || [])[1] ?? 1);
  const cfg = fresh ? structuredClone(DEFAULT_CONFIG) : loadConfig(cfgPath);

  // Tools: explicit selection · saved config · reliable auto-detection · portable fallback.
  const retiredFlagged = RETIRED_PLATFORM_IDS.filter((id) => flags[id] === true);
  if (retiredFlagged.length) throw new Error(`retired host adapter flag(s): ${retiredFlagged.map((id) => `--${id}`).join(', ')}. Use --agents for the portable layer, or choose one of: ${PLATFORM_IDS.filter((id) => id !== 'agents').map((id) => `--${id}`).join(', ')}`);
  const flagged = PLATFORM_IDS.filter((id) => flags[id] === true);
  const explicitlySelected = list(flags.tools).length > 0 || flagged.length > 0;
  let tools = list(flags.tools).length ? list(flags.tools) : flagged.length ? flagged : cfg.tools?.length && !fresh ? cfg.tools : [];
  let detectedTools = false;
  let portableFallback = false;
  let conventionDetected = [];
  let retiredFromConfig = [];
  if (!explicitlySelected && !fresh) {
    retiredFromConfig = tools.filter((id) => RETIRED_PLATFORM_IDS.includes(id));
    if (retiredFromConfig.length) tools = tools.filter((id) => !RETIRED_PLATFORM_IDS.includes(id));
    if (!tools.length && retiredFromConfig.length) {
      tools = ['agents'];
      portableFallback = true;
    }
  }
  if (!tools.length) {
    const detected = chooseDetectedTools(detectLocal().tools);
    tools = detected.tools;
    conventionDetected = detected.conventionDetected;
    portableFallback = detected.portableFallback;
    detectedTools = !portableFallback;
  }
  for (const t of tools) if (!PLATFORMS[t]) {
    if (RETIRED_PLATFORM_IDS.includes(t)) throw new Error(`retired host adapter "${t}". Use "agents" for the portable layer, or choose one of: ${PLATFORM_IDS.filter((id) => id !== 'agents').join(', ')}`);
    throw new Error(`unknown tool "${t}". Known: ${PLATFORM_IDS.join(', ')}`);
  }
  cfg.tools = [...new Set(tools)];
  const retiredOverrides = Object.keys(cfg.platforms ?? {}).filter((id) => RETIRED_PLATFORM_IDS.includes(id));
  for (const id of retiredOverrides) delete cfg.platforms[id];
  if (cfg.platforms && !Object.keys(cfg.platforms).length) delete cfg.platforms;
  const retiredModelOverrides = Object.keys(cfg.models ?? {}).filter((id) => RETIRED_PLATFORM_IDS.includes(id));
  for (const id of retiredModelOverrides) delete cfg.models[id];
  cfg.lang = flags.lang ?? cfg.lang ?? 'en';
  cfg.profile = flags.profile ?? cfg.profile ?? 'lean';
  if (flags.vendor) cfg.vendor = true;
  if (flags.guide !== undefined) cfg.guide = flags.guide !== 'false' && flags.guide !== false;
  if (flags.hooks && flags.noHooks) throw new Error('choose either --hooks or --no-hooks, not both');
  if (flags.hooks) cfg.hooks = true;
  else if (flags.noHooks) cfg.hooks = false;
  else cfg.hooks = cfg.hooks !== false;
  if (!['lean', 'guided'].includes(cfg.profile)) throw new Error('profile must be lean or guided');
  const targets = installTargets(cfg.tools, cfg);
  const priorManaged = readManagedState(root);
  const previousVersion = priorManaged?.packageVersion;
  const legacyVersion = priorManaged?.vendor === undefined ? priorManaged?.packageVersion : null;

  const project = path.basename(root);
  const tpl = path.join(skillSource(cfg.lang), 'templates');
  const projectMap = fill(read(path.join(tpl, 'README.md')), { project });

  if (flags.dryRun) {
    heading(`Keelson ${fresh ? 'init' : 'update'} (dry run) in ${root}`);
    const mapPath = path.join(root, '.keelson', 'README.md');
    console.log(`  ${(!exists(mapPath) ? 'create' : read(mapPath) === projectMap ? 'unchanged' : 'update').padEnd(9)} .keelson/README.md`);
    if (cfg.vendor) {
      const workflow = plannedWorkflowFile(root, { lang: cfg.lang, guide: cfg.guide });
      console.log(`  ${workflow.status.padEnd(9)} ${workflow.path}`);
      for (const f of plannedCanonicalSkillFiles(root, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION })) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
    }
    for (const rel of plannedManagedRemovals(root, targets)) console.log(`  ${'remove'.padEnd(9)} ${rel} (stale managed surface)`);
    const dryDiscovery = new Set();
    for (const t of targets) {
      const discoveryKey = `${t.instructions}|${t.skillsDir}|${t.rulesFile ?? ''}`;
      if (!dryDiscovery.has(discoveryKey)) {
        dryDiscovery.add(discoveryKey);
        for (const f of plannedSkillFiles(root, t, { lang: cfg.lang, version: PKG_VERSION })) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
        const ins = path.join(root, t.instructions);
        console.log(`  ${(exists(ins) ? (read(ins).includes('<!-- keelson:start -->') ? 'refresh' : 'append') : 'create').padEnd(9)} ${t.instructions}`);
      }
      for (const f of plannedSessionAdapterFiles(root, t)) console.log(`  ${f.status.padEnd(9)} ${f.path}`);
    }
    if (retiredFromConfig.length) console.log(`  migrate   config tools: drop retired ${retiredFromConfig.join(', ')}`);
    if (retiredOverrides.length) console.log(`  migrate   config platforms: drop retired ${retiredOverrides.join(', ')}`);
    if (retiredModelOverrides.length) console.log(`  migrate   config models: drop retired ${retiredModelOverrides.join(', ')}`);
    if (rawVersion < CONFIG_VERSION) console.log(`  migrate   .keelson/config.yaml v${rawVersion} → v${CONFIG_VERSION}`);
    console.log(dim('nothing written'));
    return 0;
  }

  heading(`Keelson ${fresh ? 'init' : 'update'} in ${root}`);
  // Refuse a protected shim before changing config or removing v0.3 runtime.
  assertSkillsInstallable(root, targets, { lang: cfg.lang, version: PKG_VERSION, legacyVersion, previousVersion, previousState: priorManaged, force: flags.force });
  if (cfg.vendor) {
    assertWorkflowInstallable(root, { lang: cfg.lang, guide: cfg.guide, previousState: priorManaged, force: flags.force });
    assertCanonicalSkillInstallable(root, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION, previousState: priorManaged, force: flags.force });
  }
  if (retiredFromConfig.length) warn(`retired host adapters removed from config: ${retiredFromConfig.join(', ')}; use the portable agents layer or select one of: ${PLATFORM_IDS.filter((id) => id !== 'agents').join(', ')}`);
  if (retiredOverrides.length) warn(`retired platform overrides removed: ${retiredOverrides.join(', ')}`);
  if (retiredModelOverrides.length) warn(`retired model overrides removed: ${retiredModelOverrides.join(', ')}`);
  if (detectedTools) info(`tools detected on this machine: ${cfg.tools.map((t) => PLATFORMS[t].label).join(', ')} (override with --tools or --<platform>)`);
  else if (portableFallback) {
    const note = conventionDetected.length ? `; convention-only detections: ${conventionDetected.map((t) => PLATFORMS[t].label).join(', ')} (opt in explicitly if wanted)` : '';
    info(`no verified/documented host detected; using portable AGENTS.md + .agents/skills discovery${note}`);
  }
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
  if (seed('INTENT.md', p.intent)) ok('.keelson/INTENT.md (the agent derives it from repository evidence on first contact; owner questions only when a boundary is load-bearing)');
  if (seed('NOW.md', p.now)) ok('.keelson/NOW.md');
  // Progressive disclosure: ROADMAP, GLOSSARY, rules/, specs/, and changes/ are created only when the project actually needs them.
  saveConfig(p.config, cfg);
  ok(`.keelson/config.yaml${rawVersion < CONFIG_VERSION ? ` (migrated v${rawVersion} → v${CONFIG_VERSION})` : ''}`);

  for (const rel of reconcileManagedTargets(root, targets)) ok(`removed stale managed surface → ${rel}`);

  // v0.3 had no vendor bit and always copied guidance and executable hooks.  Its
  // manifest is the ownership proof; every removal below still verifies content.
  if (priorManaged && priorManaged.vendor === undefined) {
    const legacy = removeCanonicalRuntime(root, {
      lang: cfg.lang,
      profile: cfg.profile,
      version: priorManaged.packageVersion,
      guide: cfg.guide,
    });
    const hooks = removeLegacyCopiedHooks(root);
    for (const rel of [...legacy.removed, ...hooks.removed]) ok(`removed legacy copied runtime → ${rel}`);
    for (const rel of [...legacy.preserved, ...hooks.preserved]) warn(`kept ${rel}: it differs from the v0.3 Keelson output`);
  }

  if (cfg.vendor) {
    const workflowPath = installWorkflow(root, { lang: cfg.lang, guide: cfg.guide, previousState: priorManaged, force: flags.force });
    const canonicalSkillPath = installCanonicalSkill(root, { lang: cfg.lang, profile: cfg.profile, version: PKG_VERSION, previousState: priorManaged, force: flags.force });
    ok(`vendored guidance → ${workflowPath}; ${canonicalSkillPath}`);
  } else info('guidance stays in the installed package; agents load it with `keelson guide`');

  const discoveryInstalled = new Set();
  for (const t of targets) {
    const discoveryKey = `${t.instructions}|${t.skillsDir}|${t.rulesFile ?? ''}`;
    if (!discoveryInstalled.has(discoveryKey)) {
      discoveryInstalled.add(discoveryKey);
      const skillPath = installSkill(root, t, { lang: cfg.lang, version: PKG_VERSION, legacyVersion, previousVersion, previousState: priorManaged, force: flags.force });
      const files = installInstructions(root, t, { lang: cfg.lang });
      ok(`${t.label}: discovery shim → ${skillPath}; instructions → ${files.join(', ')}${t.confidence === 'convention' ? dim(' (path by convention; run `keelson doctor` after your first session)') : ''}`);
    } else {
      info(`${t.label}: reuses existing discovery surface ${t.instructions} + ${t.skillsDir}/keelson`);
    }
    if (t.hooks && t.id === 'claude') {
      installHooks(root);
      ok(`${t.label}: hooks → .claude/settings.json (workflow restore + file-tool gate + phase context injection)`);
    }
    const sessionFiles = installSessionAdapter(root, t);
    if (sessionFiles.length) ok(`${t.label}: native session adapter → ${sessionFiles.join(', ')}`);
    if (t.sessionAdapter === 'codex-thread-env') info('Codex: review and trust the generated project hooks in /hooks when prompted; host permissions stay in control');
    else if (t.sessionAdapter === 'pi-env') info(`${t.label}: native session focus uses PI_SESSION_ID; no adapter file needed`);
  }
  writeManagedState(root, targets, PKG_VERSION, { vendor: cfg.vendor });
  ok('.keelson/manifest.json (generated-surface ownership)');

  try {
    detectAndCache();
    info(`model detection cached in ~/.keelson/models.cache.json ${dim('(keelson models)')}`);
  } catch (e) {
    warn(`model detection skipped: ${e.message}`);
  }

  // A fresh project starts with one invisible onboarding task: infer project intent
  // from repository evidence. Owner questions are reserved for load-bearing boundaries.
  // Specs and rules grow later only when real work exposes durable truth.
  if (fresh || flags.onboard) writeOnboardNote(p, project, cfg, hasCode(root));

  console.log('');
  if (fresh) {
    heading('Done. Open your agent in this directory and start talking.');
    console.log(dim('  On first contact it derives .keelson/INTENT.md from repository evidence; it asks only if a project boundary actually changes the work.'));
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
  const intent = `Draft \`.keelson/INTENT.md\` from what the repository already shows (README, package manifest, directory layout${existingCode ? ', and the code' : ''}): why it exists, its boundaries, hard constraints, and a first Authorizations section. Treat repository-backed facts as established. Do not ask for blanket approval; only ask one owner question if a missing project boundary is load-bearing for the current work.`;
  const grow = existingCode
    ? ' Do not inventory the whole repository into specs or rules. As the first real task touches a capability or stable engineering invariant, create only the spec/rule needed to preserve that truth across future sessions.'
    : '';
  write(
    p.now,
    `# Now

First contact with ${project}: Keelson was just initialised. Project intent will be derived from repository evidence as part of the first real task.

## Context
Existing documents${refs.length ? ` (${refs.join(', ')})` : ''} are referenced, never copied. INTENT.md may be refined silently when evidence is clear; owner input is needed only for a load-bearing boundary the repository cannot answer.

## Next
${intent}${grow} Do this before, or together with, the first non-trivial thing the owner asks for. Then rewrite this file to the actual current state.
`,
  );
  ok('.keelson/NOW.md: first-contact task written for the agent (derive project intent; ask only at a load-bearing boundary)');
}
