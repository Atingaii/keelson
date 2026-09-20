import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpProject, run, read, exists, write } from './helpers.js';

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-home-'));
const env = { HOME };
after(() => fs.rmSync(HOME, { recursive: true, force: true }));

// These lifecycle fixtures exercise gate behavior, using a real successful process.
function recordFixture(dir, name) {
  const config = read(dir, '.keelson/config.yaml');
  if (/^check: \[\]$/m.test(config)) write(dir, '.keelson/config.yaml', config.replace(/^check: \[\]$/m, 'check:\n  - node -e "process.exit(0)"'));
  run(dir, ['check', '--trust', '--record', '--change', name, '--quiet'], { env });
}

// Captured from the actual 0.3 project output. This fixture is deliberately
// static: migration tests must not depend on an ancestor being in CI history.
const V03_FIXTURE = path.resolve('tests/fixtures/v0.3-runtime');
const V03_CASES = ['en', 'zh'].flatMap((lang) => ['lean', 'guided'].flatMap((profile) =>
  [false, true].map((guide) => ({ lang, profile, guide }))));

function restoreV03Project(dir, { lang = 'en', profile = 'lean', guide = false, codeBuddyHook = false, checkedInHooks = false } = {}) {
  fs.cpSync(path.join(V03_FIXTURE, '.keelson'), path.join(dir, '.keelson'), { recursive: true });
  fs.cpSync(path.join(V03_FIXTURE, '.agents'), path.join(dir, '.agents'), { recursive: true });
  fs.cpSync(path.join(V03_FIXTURE, '.claude'), path.join(dir, '.claude'), { recursive: true });
  const skill = path.join(dir, '.keelson', 'skill');
  const variant = path.join(V03_FIXTURE, 'skills', `${lang}-${profile}`);
  if (fs.existsSync(variant)) {
    fs.rmSync(skill, { recursive: true, force: true });
    fs.cpSync(variant, skill, { recursive: true });
  }
  const workflow = path.join(V03_FIXTURE, 'workflows', `${lang}-${guide ? 'on' : 'off'}.md`);
  if (fs.existsSync(workflow)) fs.copyFileSync(workflow, path.join(dir, '.keelson', 'workflow.md'));
  if (lang === 'zh') fs.copyFileSync(path.join(V03_FIXTURE, 'shims', 'zh-SKILL.md'), path.join(dir, '.agents', 'skills', 'keelson', 'SKILL.md'));
  const config = read(dir, '.keelson/config.yaml')
    .replace(/^lang:.*$/m, `lang: ${lang}`)
    .replace(/^profile:.*$/m, `profile: ${profile}`)
    .replace(/^guide:.*$/m, `guide: ${guide}`);
  write(dir, '.keelson/config.yaml', config);
  if (!checkedInHooks) {
    for (const name of ['session-start.mjs', 'prompt-state.mjs']) fs.copyFileSync(path.join(V03_FIXTURE, 'hooks', name), path.join(dir, '.keelson', 'hooks', name));
  }
  if (codeBuddyHook) fs.copyFileSync(path.join(V03_FIXTURE, 'hooks', 'codebuddy-session.mjs'), path.join(dir, '.keelson', 'hooks', 'codebuddy-session.mjs'));
}

const normalizedHash = (text) => crypto.createHash('sha256').update(text.replace(/\r\n?/g, '\n')).digest('hex');
function fixtureTreeHash(dir) {
  const files = fs.readdirSync(dir, { recursive: true })
    .filter((entry) => typeof entry === 'string' && fs.statSync(path.join(dir, entry)).isFile())
    .map((rel) => ({ rel, posix: rel.split(path.sep).join('/') }))
    .sort((a, b) => a.posix < b.posix ? -1 : a.posix > b.posix ? 1 : 0);
  return normalizedHash(files.map(({ rel, posix }) => `${posix}\0${normalizedHash(fs.readFileSync(path.join(dir, rel), 'utf8'))}\n`).join(''));
}

test('the static v0.3 fixture is byte-for-byte the captured ownership matrix', () => {
  const ownership = JSON.parse(fs.readFileSync(path.join(V03_FIXTURE, 'ownership.json'), 'utf8'));
  for (const [key, expected] of Object.entries(ownership.canonicalSkills)) {
    const [lang, profile] = key.split('/');
    const dir = lang === 'en' && profile === 'lean' ? path.join(V03_FIXTURE, '.keelson', 'skill') : path.join(V03_FIXTURE, 'skills', `${lang}-${profile}`);
    assert.equal(fixtureTreeHash(dir), expected, key);
  }
  for (const [key, expected] of Object.entries(ownership.workflows)) {
    const [lang, guide] = key.split('/');
    const file = lang === 'en' && guide === 'off' ? path.join(V03_FIXTURE, '.keelson', 'workflow.md') : path.join(V03_FIXTURE, 'workflows', `${lang}-${guide}.md`);
    assert.equal(normalizedHash(fs.readFileSync(file, 'utf8')), expected, key);
  }
  assert.equal(normalizedHash(read(V03_FIXTURE, '.agents/skills/keelson/SKILL.md')), ownership.discoveryShims.en);
  assert.equal(normalizedHash(read(V03_FIXTURE, 'shims/zh-SKILL.md')), ownership.discoveryShims.zh);
  for (const [name, expected] of Object.entries(ownership.copiedHooks)) {
    const file = path.join(V03_FIXTURE, 'hooks', name);
    assert.equal(normalizedHash(fs.readFileSync(file, 'utf8')), expected, name);
  }
  for (const [name, expected] of Object.entries(ownership.checkedInHooks)) {
    const file = path.join(V03_FIXTURE, '.keelson', 'hooks', name);
    assert.equal(normalizedHash(fs.readFileSync(file, 'utf8')), expected, name);
  }
});

test('v0.3 generated and checked-in hook snapshots both retire without removing user neighbors', () => {
  for (const checkedInHooks of [false, true]) {
    const dir = tmpProject({}); restoreV03Project(dir, { checkedInHooks });
    write(dir, '.keelson/hooks/owner.mjs', '// user hook\n');
    run(dir, ['update', '--codex', '--no-hooks'], { env });
    for (const name of ['session-start.mjs', 'prompt-state.mjs']) assert.ok(!exists(dir, `.keelson/hooks/${name}`), `${checkedInHooks}: ${name}`);
    assert.equal(read(dir, '.keelson/hooks/owner.mjs'), '// user hook\n');
  }
});

test('default installation stays within the lightweight budget and leaves ignore files alone', () => {
  for (const [tool, instruction] of [['claude', 'CLAUDE.md'], ['codex', 'AGENTS.md']]) {
    const dir = tmpProject({ 'package.json': '{"name":"x"}', [instruction]: '# Mine\n', '.gitignore': 'node_modules\n# mine\n' });
    const beforeFiles = new Set(fs.readdirSync(dir, { recursive: true }).filter((entry) => typeof entry === 'string'));
    const beforeTop = new Set(fs.readdirSync(dir));
    const ignore = read(dir, '.gitignore');
    run(dir, ['init', '--tools', tool, '--no-hooks'], { env });
    const generatedFiles = fs.readdirSync(dir, { recursive: true })
      .filter((entry) => typeof entry === 'string' && !beforeFiles.has(entry))
      .filter((entry) => fs.statSync(path.join(dir, entry)).isFile());
    const generatedLines = generatedFiles.reduce((total, entry) => total + read(dir, entry).split(/\r?\n/).length, 0);
    assert.ok(generatedFiles.length <= 10, `${tool}: ${generatedFiles.join(', ')}`);
    assert.ok(generatedLines <= 400, `${tool}: ${generatedLines} generated lines`);
    assert.ok(fs.readdirSync(dir).filter((entry) => !beforeTop.has(entry)).length <= 3, tool);
    for (const rel of ['.keelson/skill', '.keelson/workflow.md', '.keelson/hooks']) assert.ok(!exists(dir, rel), `${tool}: ${rel}`);
    assert.match(read(dir, instruction), /keelson guide/);
    const skillsDir = tool === 'claude' ? '.claude/skills' : '.agents/skills';
    assert.match(read(dir, path.join(skillsDir, 'keelson', 'SKILL.md')), /keelson guide/);
    assert.equal(read(dir, '.gitignore'), ignore);
    run(dir, ['update', '--no-hooks'], { env });
    assert.equal(read(dir, '.gitignore'), ignore);
  }
});

test('claude-only init has no portable or vendored layer', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  for (const rel of ['AGENTS.md', '.agents', '.keelson/skill', '.keelson/workflow.md']) assert.ok(!exists(dir, rel), rel);
  assert.ok(exists(dir, '.claude/skills/keelson/SKILL.md'));
});

test('switching hosts removes only managed adapters and keeps user instructions', () => {
  const dir = tmpProject({ 'CLAUDE.md': '# Mine\n', 'AGENTS.md': '# Shared\n' });
  run(dir, ['init', '--tools', 'claude,kiro', '--no-hooks'], { env });
  assert.ok(exists(dir, '.claude/skills/keelson/SKILL.md'));
  assert.ok(exists(dir, '.kiro/skills/keelson/SKILL.md'));
  run(dir, ['update', '--tools', 'codex', '--no-hooks'], { env });
  assert.ok(!exists(dir, '.claude/skills/keelson'));
  assert.ok(!exists(dir, '.kiro/skills/keelson'));
  assert.equal(read(dir, 'CLAUDE.md'), '# Mine\n');
  assert.match(read(dir, 'AGENTS.md'), /^# Shared/);
  assert.match(read(dir, 'AGENTS.md'), /keelson guide/);
});

test('switching hosts retains a changed discovery shim and its neighboring files', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  write(dir, '.claude/skills/keelson/SKILL.md', '# user shim\n');
  write(dir, '.claude/skills/keelson/neighbor.md', '# owner note\n');
  run(dir, ['update', '--codex', '--no-hooks'], { env });
  assert.equal(read(dir, '.claude/skills/keelson/SKILL.md'), '# user shim\n');
  assert.equal(read(dir, '.claude/skills/keelson/neighbor.md'), '# owner note\n');
  assert.match(read(dir, '.agents/skills/keelson/SKILL.md'), /keelson guide/);
});

test('an unchanged discovery shim with hidden user neighbors is never removed', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  write(dir, '.claude/skills/keelson/node_modules/owner.txt', 'owner dependency\n');
  write(dir, '.claude/skills/keelson/.git/owner', 'owner metadata\n');
  run(dir, ['update', '--codex', '--no-hooks'], { env });
  assert.equal(read(dir, '.claude/skills/keelson/node_modules/owner.txt'), 'owner dependency\n');
  assert.equal(read(dir, '.claude/skills/keelson/.git/owner'), 'owner metadata\n');
  run(dir, ['uninstall'], { env });
  assert.equal(read(dir, '.claude/skills/keelson/node_modules/owner.txt'), 'owner dependency\n');
  assert.equal(read(dir, '.claude/skills/keelson/.git/owner'), 'owner metadata\n');
});

test('migration and uninstall preserve user directory links to exact generated content', () => {
  for (const surface of ['.keelson/skill', '.agents/skills/keelson']) {
    for (const operation of ['update', 'uninstall']) {
      const dir = tmpProject({}); restoreV03Project(dir);
      const external = tmpProject({});
      const source = path.join(dir, surface);
      const target = path.join(external, 'linked-content');
      fs.renameSync(source, target);
      const before = fixtureTreeHash(target);
      fs.symlinkSync(target, source, process.platform === 'win32' ? 'junction' : 'dir');
      const config = read(dir, '.keelson/config.yaml');
      const result = run(dir, operation === 'update' ? ['update', '--codex', '--no-hooks'] : ['uninstall'], { env, allowFail: true });
      const refused = surface === '.agents/skills/keelson' && operation === 'update';
      assert.equal(result.code, refused ? 1 : 0, `${surface}: ${operation}`);
      assert.ok(fs.lstatSync(source).isSymbolicLink(), `${surface}: ${operation} preserves the link`);
      assert.equal(fixtureTreeHash(target), before, `${surface}: ${operation} preserves its target`);
      if (refused) assert.equal(read(dir, '.keelson/config.yaml'), config);
    }
  }
});

test('migration and uninstall preserve user file links to exact legacy workflows and hooks', (t) => {
  if (process.platform === 'win32') return t.skip('file symlinks require privileges not assumed on Windows');
  for (const surface of ['.keelson/workflow.md', '.keelson/hooks/session-start.mjs', '.keelson/hooks/codebuddy-session.mjs']) {
    for (const operation of ['update', 'uninstall']) {
      const dir = tmpProject({}); restoreV03Project(dir, { codeBuddyHook: true });
      const external = tmpProject({});
      const source = path.join(dir, surface);
      const target = path.join(external, 'linked-content');
      fs.renameSync(source, target);
      const before = fs.readFileSync(target);
      fs.symlinkSync(target, source);
      run(dir, operation === 'update' ? ['update', '--codex', '--no-hooks'] : ['uninstall'], { env });
      assert.ok(fs.lstatSync(source).isSymbolicLink(), `${surface}: ${operation} preserves the link`);
      assert.deepEqual(fs.readFileSync(target), before, `${surface}: ${operation} preserves its target`);
    }
  }
});

test('Kiro upsert retains frontmatter and user content', () => {
  const dir = tmpProject({ 'AGENTS.md': '---\ninclusion: always\n---\n\n# User note\n' });
  run(dir, ['init', '--tools', 'kiro', '--no-hooks'], { env });
  assert.match(read(dir, 'AGENTS.md'), /^---\ninclusion: always\n---/); assert.match(read(dir, 'AGENTS.md'), /# User note/);
  run(dir, ['update', '--no-hooks'], { env }); assert.equal((read(dir, 'AGENTS.md').match(/keelson:start/g) || []).length, 1);
});


test('update migrates every exact real v0.3 runtime profile to a light Codex install', () => {
  for (const options of V03_CASES) {
    const dir = tmpProject({}); restoreV03Project(dir, options);
    run(dir, ['update', '--codex', '--no-hooks'], { env });
    for (const rel of ['.keelson/skill', '.keelson/workflow.md', '.keelson/hooks']) assert.ok(!exists(dir, rel), `${options.lang}/${options.profile}/${options.guide}: ${rel}`);
    assert.match(read(dir, '.agents/skills/keelson/SKILL.md'), /keelson guide/);
    assert.equal(JSON.parse(read(dir, '.keelson/manifest.json')).vendor, false);
    assert.equal(JSON.parse(read(dir, '.claude/settings.json')).hooks, undefined);
  }
});

test('a one-byte change to each v0.3 canonical profile stays protected', () => {
  for (const options of V03_CASES) {
    const dir = tmpProject({}); restoreV03Project(dir, options);
    const skill = '.keelson/skill/SKILL.md';
    const original = read(dir, skill);
    write(dir, skill, `${original}x`);
    run(dir, ['update', '--codex', '--no-hooks'], { env });
    assert.equal(read(dir, skill), `${original}x`, `${options.lang}/${options.profile}/${options.guide}`);
    assert.ok(!exists(dir, '.keelson/workflow.md'));
  }
});

test('v0.3 migration retains an edited copied hook', () => {
  const dir = tmpProject({}); restoreV03Project(dir);
  write(dir, '.keelson/hooks/prompt-state.mjs', '// user hook\n');
  run(dir, ['update', '--codex', '--no-hooks'], { env });
  assert.equal(read(dir, '.keelson/hooks/prompt-state.mjs'), '// user hook\n');
  assert.ok(!exists(dir, '.keelson/hooks/session-start.mjs'));
});

test('v0.3 retires only the exact copied CodeBuddy hook', () => {
  const known = tmpProject({}); restoreV03Project(known, { codeBuddyHook: true });
  write(known, '.keelson/hooks/owner.mjs', '// owner hook\n');
  run(known, ['update', '--codebuddy', '--no-hooks'], { env });
  assert.ok(!exists(known, '.keelson/hooks/codebuddy-session.mjs'));
  assert.equal(read(known, '.keelson/hooks/owner.mjs'), '// owner hook\n');

  const edited = tmpProject({}); restoreV03Project(edited, { codeBuddyHook: true });
  write(edited, '.keelson/hooks/codebuddy-session.mjs', '// owner edit\n');
  run(edited, ['update', '--codebuddy', '--no-hooks'], { env });
  assert.equal(read(edited, '.keelson/hooks/codebuddy-session.mjs'), '// owner edit\n');
});

test('a custom v0.3 discovery shim stops migration before any write', () => {
  const dir = tmpProject({}); restoreV03Project(dir);
  const config = read(dir, '.keelson/config.yaml');
  const manifest = read(dir, '.keelson/manifest.json');
  write(dir, '.agents/skills/keelson/SKILL.md', '# user shim\n');
  const result = run(dir, ['update', '--codex', '--no-hooks'], { env, allowFail: true });
  assert.equal(result.code, 1); assert.match(result.stderr, /discovery shim differs/);
  assert.equal(read(dir, '.keelson/config.yaml'), config);
  assert.equal(read(dir, '.keelson/manifest.json'), manifest);
  assert.ok(exists(dir, '.keelson/skill'));
  assert.equal(read(dir, '.agents/skills/keelson/SKILL.md'), '# user shim\n');
});


test('malformed host JSON fails without overwriting the user file', () => {
  const dir = tmpProject({ '.claude/settings.json': '{not valid json\n' });
  const result = run(dir, ['init', '--tools', 'claude'], { env, allowFail: true });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /cannot parse .*settings\.json/);
  assert.equal(read(dir, '.claude/settings.json'), '{not valid json\n');
});


test('Codex reports native session identity only when CODEX_THREAD_ID is available', async () => {
  const { runtimeDir } = await import('../src/lib/runtime-path.js');
  const dir = tmpProject({}); execFileSync('git', ['init', '-q'], { cwd: dir }); run(dir, ['init', '--tools', 'codex', '--no-hooks'], { env });
  const codexEnv = { ...env, CODEX_THREAD_ID: 'thread-1' }; run(dir, ['new', 'work'], { env: codexEnv });
  assert.ok(fs.existsSync(path.join(runtimeDir(dir), 'sessions'))); assert.ok(!exists(dir, '.keelson/.runtime'));
  const reportText = run(dir, ['doctor', '--session', '--json'], { env: codexEnv }).stdout;
  const report = JSON.parse(reportText.slice(reportText.indexOf('\n{') + 1));
  assert.equal(report.session.tools[0].mode, 'native'); assert.equal(report.session.tools[0].source, 'CODEX_THREAD_ID');
  const absentText = run(dir, ['doctor', '--session', '--json'], { env: { ...env, CODEX_THREAD_ID: '' } }).stdout;
  const absent = JSON.parse(absentText.slice(absentText.indexOf('\n{') + 1));
  assert.equal(absent.session.tools[0].mode, 'degraded');
});


test('OpenCode is honestly degraded without a copied plugin', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'opencode', '--no-hooks'], { env });
  assert.ok(!exists(dir, '.opencode/plugins/keelson-session.js'));
  const text = run(dir, ['doctor', '--session', '--json'], { env }).stdout;
  assert.equal(JSON.parse(text.slice(text.indexOf('\n{') + 1)).session.tools[0].mode, 'degraded');
});


test('guide uses persisted project language profile and guided setting without vendoring', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--lang', 'zh', '--profile', 'guided', '--guide', '--no-hooks'], { env });
  assert.match(run(dir, ['guide', 'workflow'], { env }).stdout, /引导模式/);
  assert.doesNotMatch(run(dir, ['guide', 'build'], { env }).stdout, /<!-- guided -->/);
  assert.ok(!exists(dir, '.keelson/skill'));
});

test('update switches the language of an unchanged managed shim but protects edits', () => {
  const dir = tmpProject({}); run(dir, ['init', '--codex', '--lang', 'en', '--no-hooks'], { env });
  run(dir, ['update', '--lang', 'zh', '--no-hooks'], { env });
  assert.match(read(dir, '.agents/skills/keelson/SKILL.md'), /这是发现入口/);
  run(dir, ['update', '--lang', 'en', '--no-hooks'], { env });
  assert.match(read(dir, '.agents/skills/keelson/SKILL.md'), /This is a discovery shim/);
  const config = read(dir, '.keelson/config.yaml');
  const custom = read(dir, '.agents/skills/keelson/SKILL.md') + '\nOwner instruction.\n';
  write(dir, '.agents/skills/keelson/SKILL.md', custom);
  const result = run(dir, ['update', '--lang', 'zh', '--no-hooks'], { env, allowFail: true });
  assert.equal(result.code, 1);
  assert.equal(read(dir, '.keelson/config.yaml'), config);
  assert.equal(read(dir, '.agents/skills/keelson/SKILL.md'), custom);
});

test('v0.3 hook commands migrate or retire individually while preserving user hooks', () => {
  for (const tool of ['claude', 'codebuddy']) {
    const envName = tool === 'claude' ? 'CLAUDE_PROJECT_DIR' : 'CODEBUDDY_PROJECT_DIR';
    const script = tool === 'claude' ? 'session-start' : 'codebuddy-session';
    const old = `node "$${envName}/.keelson/hooks/${script}.mjs"`;
    const neighbor = { type: 'command', command: `echo '${old}'`, timeout: 42 };
    const settingsPath = `.${tool}/settings.json`;
    const settings = { owner: 'retained', hooks: { SessionStart: [{ matcher: 'owner-matcher', hooks: [
      { type: 'command', command: old, timeout: 10 }, neighbor,
    ] }] } };
    const dir = tmpProject({ [settingsPath]: JSON.stringify(settings) });
    run(dir, ['init', `--${tool}`], { env });
    let actual = JSON.parse(read(dir, settingsPath));
    assert.equal(actual.owner, 'retained');
    assert.deepEqual(actual.hooks.SessionStart[0], { matcher: 'owner-matcher', hooks: [neighbor] });
    const commands = Object.values(actual.hooks).flatMap(groups => groups.flatMap(group => group.hooks.map(hook => hook.command)));
    assert.ok(!commands.includes(old));
    assert.equal(commands.filter(command => command === `keelson hook ${script}`).length, tool === 'claude' ? 1 : 3);
    // Exercise disabling directly from the legacy registration too.
    write(dir, settingsPath, JSON.stringify(settings));
    run(dir, ['update', '--codex', '--no-hooks'], { env });
    actual = JSON.parse(read(dir, settingsPath));
    assert.deepEqual(actual, { owner: 'retained', hooks: { SessionStart: [{ matcher: 'owner-matcher', hooks: [neighbor] }] } });
  }
});


test('unproven legacy Keelson-looking surfaces are retained with neighboring user files', () => {
  const dir = tmpProject({
    '.cursor/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.cursor/rules/keelson.mdc': '# Keelson\nold\n',
    '.cursor/rules/user.mdc': '# My rule\n',
    '.github/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.kilocode/skills/keelson/SKILL.md': '---\nname: keelson\n---\n# Old Keelson\n',
    '.kilocode/rules/keelson.md': '# Keelson\nold\n',
    '.kiro/steering/keelson.md': '# Keelson\nold\n',
    '.qoder/rules/keelson.md': '# Keelson\nold\n',
  });
  run(dir, ['init', '--tools', 'agents', '--no-hooks'], { env });
  for (const legacy of [
    '.cursor/skills/keelson',
    '.cursor/rules/keelson.mdc',
    '.github/skills/keelson',
    '.kilocode/skills/keelson',
    '.kilocode/rules/keelson.md',
    '.kiro/steering/keelson.md',
    '.qoder/rules/keelson.md',
  ]) assert.ok(exists(dir, legacy), legacy);
  assert.ok(exists(dir, '.cursor/rules/user.mdc'));
});

test('legacy hidden managed state migrates to manifest.json on update', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'agents', '--no-hooks'], { env });
  const current = JSON.parse(read(dir, '.keelson/manifest.json'));
  current.version = current.schema;
  delete current.schema;
  write(dir, '.keelson/.managed.json', JSON.stringify(current, null, 2) + '\n');
  fs.rmSync(path.join(dir, '.keelson/manifest.json'));

  run(dir, ['update'], { env });
  assert.ok(exists(dir, '.keelson/manifest.json'));
  assert.ok(!exists(dir, '.keelson/.managed.json'));
  assert.equal(JSON.parse(read(dir, '.keelson/manifest.json')).schema, 1);
  run(dir, ['doctor', '--json'], { env });
});

test('retired host selections fail clearly and old config is migrated to portable support', () => {
  const dir = tmpProject({});
  let r = run(dir, ['init', '--cursor'], { env, allowFail: true });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /retired host adapter.*--cursor/);
  assert.match(r.stderr, /--agents/);

  run(dir, ['init', '--tools', 'agents', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', [
    'version: 4',
    'tools:',
    '  - cursor',
    'platforms:',
    '  cursor:',
    '    skillsDir: .cursor/skills',
    'models:',
    '  cursor:',
    '    deep: old-family',
    'hooks: false',
    ''
  ].join('\n'));

  const dry = run(dir, ['update', '--dry-run'], { env }).stdout;
  assert.match(dry, /config tools: drop retired cursor/);
  assert.match(dry, /config platforms: drop retired cursor/);
  assert.match(dry, /config models: drop retired cursor/);

  run(dir, ['update'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /tools:\n\s+- agents/);
  assert.doesNotMatch(cfg, /cursor/);
  run(dir, ['doctor', '--json'], { env });
});

test('all platforms install selected discovery only and doctor accepts default light install', () => {
  const reg = JSON.parse(fs.readFileSync(path.resolve('registry/platforms.json'), 'utf8'));
  for (const [id, platform] of Object.entries(reg.platforms)) {
    const dir = tmpProject({}); run(dir, ['init', '--tools', id, '--no-hooks'], { env });
    assert.ok(!exists(dir, '.keelson/skill')); assert.ok(!exists(dir, '.keelson/workflow.md'));
    assert.match(read(dir, path.join(platform.skillsDir, 'keelson', 'SKILL.md')), /keelson guide/);
    run(dir, ['doctor', '--json'], { env });
  }
});

test('vendor is opt-in and changed guidance or discovery shims are never replaced or deleted', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'agents', '--no-hooks', '--vendor'], { env });
  write(dir, '.keelson/skill/references/build.md', read(dir, '.keelson/skill/references/build.md') + '\nuser edit\n');
  const update = run(dir, ['update', '--no-hooks'], { env, allowFail: true });
  assert.equal(update.code, 1); assert.match(update.stderr, /vendored skill differs/);
  run(dir, ['uninstall'], { env });
  assert.ok(exists(dir, '.keelson/skill/references/build.md'));
  assert.ok(!exists(dir, '.keelson/workflow.md'), 'unchanged vendor workflow is removed independently');
  const shim = tmpProject({});
  run(shim, ['init', '--tools', 'claude', '--no-hooks'], { env });
  write(shim, '.claude/skills/keelson/SKILL.md', '# user shim\n');
  const protectedUpdate = run(shim, ['update', '--no-hooks'], { env, allowFail: true });
  assert.equal(protectedUpdate.code, 1); assert.match(protectedUpdate.stderr, /discovery shim differs/);
  assert.equal(read(shim, '.claude/skills/keelson/SKILL.md'), '# user shim\n');
  write(shim, '.claude/skills/keelson/neighbor.md', '# owner note\n');
  run(shim, ['uninstall'], { env });
  assert.equal(read(shim, '.claude/skills/keelson/SKILL.md'), '# user shim\n');
  assert.equal(read(shim, '.claude/skills/keelson/neighbor.md'), '# owner note\n');
});

test('no-hooks is persistent and can be explicitly re-enabled', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: false$/m);
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.ok(!exists(dir, '.claude/settings.json'));

  run(dir, ['update'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: false$/m);
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.ok(!exists(dir, '.claude/settings.json'));

  run(dir, ['update', '--hooks'], { env });
  assert.match(read(dir, '.keelson/config.yaml'), /^hooks: true$/m);
  assert.ok(!exists(dir, '.keelson/hooks'));
  assert.match(read(dir, '.claude/settings.json'), /keelson hook session-start/);
  run(dir, ['doctor', '--json'], { env });
});

test('hooks call the installed CLI and do not copy executable scripts', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env }); run(dir, ['update', '--hooks'], { env });
  assert.match(read(dir, '.claude/settings.json'), /keelson hook session-start/); assert.ok(!exists(dir, '.keelson/hooks'));
  const buddy = tmpProject({ '.codebuddy/settings.json': '{"theme":"mine"}\n' }); run(buddy, ['init', '--tools', 'codebuddy', '--hooks'], { env });
  assert.match(read(buddy, '.codebuddy/settings.json'), /keelson hook codebuddy-session/); assert.ok(!exists(buddy, '.keelson/hooks'));
});

test('removing hooks keeps user hooks in mixed Claude and CodeBuddy groups', () => {
  const claude = tmpProject({
    '.claude/settings.json': JSON.stringify({ hooks: {
      SessionStart: [{ matcher: 'startup', hooks: [
        { type: 'command', command: 'keelson hook session-start' },
        { type: 'command', command: "echo 'keelson hook session-start'" },
        { type: 'command', command: 'echo owner-session' },
      ] }],
      UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'keelson hook prompt-state' }, { type: 'command', command: 'echo owner-prompt' }] }],
    } }, null, 2) + '\n',
  });
  run(claude, ['init', '--tools', 'claude', '--hooks'], { env });
  run(claude, ['update', '--no-hooks'], { env });
  const claudeHooks = read(claude, '.claude/settings.json');
  assert.equal(JSON.parse(claudeHooks).hooks.SessionStart[0].matcher, 'startup');
  assert.doesNotMatch(claudeHooks, /"keelson hook (?:session-start|prompt-state)"/);
  assert.match(claudeHooks, /echo 'keelson hook session-start'/);
  assert.match(claudeHooks, /echo owner-session/); assert.match(claudeHooks, /echo owner-prompt/);

  const buddy = tmpProject({
    '.codebuddy/settings.json': JSON.stringify({ hooks: { SessionStart: [{ hooks: [
      { type: 'command', command: 'keelson hook codebuddy-session' },
      { type: 'command', command: "echo 'keelson hook codebuddy-session'" },
      { type: 'command', command: 'echo owner-buddy' },
    ] }] } }, null, 2) + '\n',
  });
  run(buddy, ['init', '--tools', 'codebuddy', '--hooks'], { env });
  run(buddy, ['uninstall'], { env });
  const buddyHooks = read(buddy, '.codebuddy/settings.json');
  assert.doesNotMatch(buddyHooks, /"keelson hook codebuddy-session"/);
  assert.match(buddyHooks, /echo 'keelson hook codebuddy-session'/);
  assert.match(buddyHooks, /echo owner-buddy/);
});

test('fresh init auto-detects only first-class hosts and otherwise uses the portable layer', async () => {
  const { chooseDetectedTools } = await import('../src/commands/init.js');
  const none = chooseDetectedTools({});
  assert.deepEqual(none.tools, ['agents']);
  assert.equal(none.portableFallback, true);

  const retiredOrUnknown = chooseDetectedTools({
    cursor: { installed: true },
    snow: { installed: true },
  });
  assert.deepEqual(retiredOrUnknown.tools, ['agents']);
  assert.equal(retiredOrUnknown.portableFallback, true);

  const reliable = chooseDetectedTools({
    codex: { installed: true },
    pi: { installed: true },
    cursor: { installed: true },
  });
  assert.deepEqual(reliable.tools.sort(), ['codex', 'pi']);
  assert.equal(reliable.portableFallback, false);
});

test('runtime sessions live outside the project', async () => {
  const { runtimeDir } = await import('../src/lib/runtime-path.js'); const dir = tmpProject({}); execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env }); run(dir, ['new', 'runtime-work'], { env: { ...env, KEELSON_SESSION_ID: 'runtime-session' } }); assert.ok(fs.existsSync(runtimeDir(dir))); assert.ok(!exists(dir, '.keelson/.runtime'));
});





test('change artifacts grow progressively instead of starting empty', () => {
  const dir = tmpProject({ 'package.json': JSON.stringify({ name: 'x', scripts: { test: 'node -e "process.exit(0)"' } }) });
  run(dir, ['init', '--no-hooks'], { env });

  run(dir, ['new', 'quick-fix', '--tier', 'quick'], { env });
  assert.ok(exists(dir, '.keelson/changes/quick-fix/change.md'));
  assert.ok(!exists(dir, '.keelson/changes/quick-fix/tasks.md'));
  assert.ok(!exists(dir, '.keelson/changes/quick-fix/ledger.md'));
  assert.ok(!exists(dir, '.keelson/changes/quick-fix/handoff.md'));

  write(dir, '.keelson/changes/quick-fix/change.md', read(dir, '.keelson/changes/quick-fix/change.md').replace('- [ ] … — check: `…`', '- [x] works — check: `npm test`'));
  run(dir, ['check', '--trust', '--record', 'quick works', '--change', 'quick-fix', '--quiet'], { env });
  assert.ok(exists(dir, '.keelson/changes/quick-fix/ledger.md'));
  run(dir, ['land', 'quick-fix', '--now', 'Nothing in flight.'], { env });
  assert.ok(!exists(dir, '.keelson/changes/quick-fix'), 'quick change lands without ever needing tasks.md');

  run(dir, ['new', 'new-contract', '--tier', 'spec', '--capability', 'orders'], { env });
  assert.ok(exists(dir, '.keelson/changes/new-contract/change.md'));
  assert.ok(exists(dir, '.keelson/changes/new-contract/tasks.md'));
  assert.ok(exists(dir, '.keelson/changes/new-contract/specs/orders/spec.md'));
  assert.ok(!exists(dir, '.keelson/changes/new-contract/ledger.md'));
});

test('change lifecycle: new → gates → check --record → land folds specs and decisions', () => {
  const dir = tmpProject({ 'package.json': '{"name":"x","scripts":{"test":"echo ok"}}' });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/INTENT.md', '# x\n\n## Why this exists\nReal text.\n');
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: Listing\nlists\n### Scenario: s\n- WHEN a\n- THEN b\n');
  run(dir, ['new', 'Add pagination', '--tier', 'spec', '--capability', 'orders', '--touches', 'src/api/**'], { env });
  const front = read(dir, '.keelson/changes/add-pagination/change.md');
  assert.match(front, /^status: clarifying$/m);
  assert.match(front, /^owner: /m);
  assert.match(front, /^touches: \[src\/api\/\*\*\]$/m);
  assert.match(read(dir, '.keelson/changes/add-pagination/specs/orders/spec.md'), /^base: [0-9a-f]{10}$/m);
  write(dir, '.keelson/changes/add-pagination/change.md', `---\ntier: spec\ncreated: 2026-01-01\nstatus: in-progress\n---\n# Add pagination\n\n## Why\nw\n\n## What\n- x\n\n## How\nh\n\n## Alternatives\n- **offset (chosen)** — a\n- **cursor** — strongest: b. Rejected because: c\n\n## Impact\n- i\n\n## Acceptance\n- [ ] default page is 20 — test: orders.default\n\n## Open questions\n- clamp or reject oversized pages? — blocks: Limits\n\n## Decisions\n- orders: offset pagination over cursor; cursor rejected because page jumps are required\n- (assumed) orders: oversized pages are clamped\n`);
  write(dir, '.keelson/changes/add-pagination/specs/orders/spec.md', `---\nbase: ${read(dir, '.keelson/changes/add-pagination/specs/orders/spec.md').match(/^base: (\S+)/m)[1]}\n---\n## ADDED Requirements\n### Requirement: Page size\nThe API SHALL cap size at 200.\n#### Scenario: big\n- WHEN size=500\n- THEN 400\n`);
  write(dir, '.keelson/changes/add-pagination/tasks.md', '# Tasks\n\n## Slice: Paging\nDelivers: pages work\n- [ ] 1. Do it (effort: light) — verify: `echo ok`\n');
  write(dir, '.keelson/changes/add-pagination/ledger.md', '# Ledger\n');
  assert.equal(JSON.parse(run(dir, ['validate', '--json'], { env }).stdout).ok, true);
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0];
  assert.equal(st.work, 'in-progress');
  assert.equal(st.verification.state, 'not-run');
  assert.equal(st.slices[0].name, 'Paging');
  assert.equal(st.open[0].blocks[0], 'Limits');
  // every gate fires
  const refused = run(dir, ['land'], { env, allowFail: true });
  assert.equal(refused.code, 1);
  for (const re of [/acceptance item\(s\) unchecked/, /open question/, /verification not-run/, /assumed decision/]) assert.match(refused.stderr, re);
  assert.doesNotMatch(refused.stderr, /task\(s\) unchecked/);
  // finish the work
  write(dir, '.keelson/changes/add-pagination/tasks.md', '# Tasks\n\n## Slice: Paging\nDelivers: pages work\n- [x] 1. Do it (effort: light) — verify: `echo ok`\n');
  let cm = read(dir, '.keelson/changes/add-pagination/change.md').replace('- [ ] default', '- [x] default').replace(/## Open questions\n- [^\n]+\n/, '## Open questions\n- none\n');
  write(dir, '.keelson/changes/add-pagination/change.md', cm);
  const rec = run(dir, ['check', '--trust', '--record', 'pagination', '--quiet'], { env });
  assert.match(rec.stdout, /recorded in/);
  assert.match(read(dir, '.keelson/changes/add-pagination/ledger.md'), /### Verify: pagination\n`npm run test` exit 0 · tree [0-9a-f]{10}/);
  assert.ok(fs.readdirSync(path.join(dir, '.keelson/changes/add-pagination/evidence')).some((f) => f.endsWith('.log')));
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].verification.state, 'passed');
  const onlyAssumed = run(dir, ['land'], { env, allowFail: true });
  assert.match(onlyAssumed.stderr, /assumed decision/);
  assert.doesNotMatch(onlyAssumed.stderr, /unchecked|open question|verification/);
  // code edit → stale
  write(dir, 'src/x.js', 'export const x = 1;\n');
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].verification.state, 'stale');
  assert.match(run(dir, ['land', '--confirm-assumptions'], { env, allowFail: true }).stderr, /verification stale/);
  run(dir, ['check', '--trust', '--record', 'after edit', '--quiet'], { env });
  // main spec moved → drift is a lifecycle gate everywhere, not a land-only surprise.
  write(dir, '.keelson/specs/orders/spec.md', read(dir, '.keelson/specs/orders/spec.md') + '\n## Requirement: Extra\nx\n### Scenario: y\n- WHEN\n- THEN\n');
  const drifted = JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0];
  assert.equal(drifted.work, 'in-progress');
  assert.ok(drifted.gates.some((g) => g.code === 'drift' && g.pass === false));
  assert.match(run(dir, ['land', '--confirm-assumptions'], { env, allowFail: true }).stderr, /changed since this delta was written/);
  assert.equal(drifted.verification.state, 'stale');
  run(dir, ['check', '--trust', '--record', '--quiet'], { env });
  run(dir, ['land', '--confirm-assumptions', '--accept-drift', '--now', '# Now\n\nNothing in flight.'], { env });
  assert.ok(!exists(dir, '.keelson/changes/add-pagination'));
  const spec = read(dir, '.keelson/specs/orders/spec.md');
  assert.match(spec, /## Requirement: Page size/);
  assert.match(spec, /## Requirement: Extra/);
  assert.match(spec, /- orders: offset pagination over cursor/);
  assert.match(spec, /- orders: oversized pages are clamped/);
  assert.match(read(dir, '.keelson/NOW.md'), /Nothing in flight/);
  assert.equal((read(dir, '.keelson/NOW.md').match(/^# Now$/gm) || []).length, 1);
});

test('land --keep archives instead of folding', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'tidy', '--tier', 'quick'], { env });
  write(dir, '.keelson/changes/tidy/tasks.md', '- [x] 1. a (effort: light)\n');
  write(dir, '.keelson/changes/tidy/change.md', read(dir, '.keelson/changes/tidy/change.md').replace(/## Acceptance[\s\S]*$/, '## Acceptance\n- [x] done — check: `true`\n'));
  write(dir, '.keelson/changes/tidy/ledger.md', '### Verify: ok\n`true` exit 0\n');
  recordFixture(dir, 'tidy');
  run(dir, ['land', 'tidy', '--keep'], { env });
  assert.equal(JSON.parse(read(dir, path.join('.keelson/changes/archive', fs.readdirSync(path.join(dir, '.keelson/changes/archive'))[0], 'landed.json'))).status, 'integrated');
  const archived = fs.readdirSync(path.join(dir, '.keelson/changes/archive'));
  assert.equal(archived.length, 1);
  assert.match(archived[0], /^\d{4}-\d{2}-\d{2}-tidy$/);
});

test('validate catches dated model IDs, bad tiers, missing rule files', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/rules/index.md', '- `**` → nope.md\n');
  run(dir, ['new', 'bad', '--tier', 'quick'], { env });
  write(dir, '.keelson/changes/bad/tasks.md', '- [ ] 1. x (effort: light)\n');
  write(dir, '.keelson/changes/bad/ledger.md', '### Note: use claude-sonnet-4-20250514 for this\n');
  const r = run(dir, ['validate', '--json'], { env, allowFail: true });
  assert.equal(r.code, 1);
  const { errors } = JSON.parse(r.stdout);
  assert.ok(errors.some((e) => /dated model ID/.test(e)));
  assert.ok(errors.some((e) => /missing file: nope.md/.test(e)));
});

test('validate checks nested contracts and rejects empty, duplicate, and malformed delta requirements', () => {
  const valid = tmpProject({});
  run(valid, ['init', '--no-hooks'], { env });
  write(valid, '.keelson/specs/payments/spec.md', [
    '# payments',
    '',
    '## Notes',
    '',
    '```markdown',
    '### Requirement: example only',
    '#### Scenario: example only',
    '```',
    '',
    '## Requirements',
    '',
    '### Requirement: 退款',
    '',
    'The system SHALL issue a refund.',
    '',
    '#### Scenario: paid order',
    '- WHEN an order is paid',
    '- THEN it is refunded',
    '',
  ].join('\r\n'));
  const validResult = JSON.parse(run(valid, ['validate', '--json'], { env }).stdout);
  assert.equal(validResult.ok, true, validResult.errors.join('\n'));

  const invalid = tmpProject({});
  run(invalid, ['init', '--no-hooks'], { env });
  write(invalid, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: 重复\n\n## Requirement: 重复\n');
  run(invalid, ['new', 'bad-delta', '--tier', 'spec', '--capability', 'orders'], { env });
  write(invalid, '.keelson/changes/bad-delta/specs/orders/spec.md', '---\nbase: new\n---\n## ADDED Requirements\n### Requirement:\n\n## NOTED Requirements\n### Requirement: misplaced\n');
  const result = JSON.parse(run(invalid, ['validate', '--json'], { env, allowFail: true }).stdout);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /duplicate requirement/.test(e)));
  assert.ok(result.errors.some((e) => /empty body/.test(e)));
  assert.ok(result.errors.some((e) => /malformed delta: ADDED Requirements has a requirement with no name/.test(e)));
  assert.ok(result.errors.some((e) => /malformed delta: unrecognized requirements section/.test(e)));
});

test('context routes rules by path', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/rules/index.md', '- `**` → general.md\n- `src/api/**` → api.md\n');
  write(dir, '.keelson/rules/general.md', '# General\n- keep changes scoped\n');
  write(dir, '.keelson/rules/api.md', '# API\n- envelope\n');
  const hit = run(dir, ['context', '--paths', 'src/api/x.js'], { env }).stdout;
  assert.match(hit, /rules\/api.md/);
  const miss = run(dir, ['context', '--paths', 'src/web/x.js'], { env }).stdout;
  assert.doesNotMatch(miss, /rules\/api.md/);
  assert.match(miss, /rules\/general.md/);
  const j = JSON.parse(run(dir, ['context', '--json'], { env }).stdout);
  assert.equal(j.rules.length, 1);
});

test('check runs configured commands and reports exit codes', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', 'check:\n  - "exit 0"\n  - "exit 3"\n');
  const r = run(dir, ['check', '--trust', '--quiet', '--json'], { env, allowFail: true });
  assert.equal(r.code, 1);
  assert.equal(JSON.parse(r.stdout).results[1].exit, 3);
});


test('sessions focus independent work items; ready is derived without a user finish phrase', () => {
  const dir = tmpProject({ 'package.json': JSON.stringify({ name: 'x', scripts: { test: 'node -e "process.exit(0)"' } }) });
  run(dir, ['init', '--no-hooks'], { env });
  const envA = { ...env, KEELSON_SESSION_ID: 'session-a' };
  const envB = { ...env, KEELSON_SESSION_ID: 'session-b' };
  const envC = { ...env, KEELSON_SESSION_ID: 'session-c' };

  run(dir, ['new', 'alpha'], { env: envA });
  run(dir, ['new', 'beta'], { env: envB });
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envA }).stdout).focus, 'alpha');
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envB }).stdout).focus, 'beta');

  for (const name of ['alpha', 'beta']) {
    write(dir, `.keelson/changes/${name}/change.md`, read(dir, `.keelson/changes/${name}/change.md`).replace('- [ ] … — check: `…`', '- [x] works — check: `npm test`'));
  }
  // Execution plans are advisory. A stale/alternative task must not become a second
  // human-maintained completion signal once the accepted outcome is verified.
  write(dir, '.keelson/changes/alpha/tasks.md', '- [ ] optional cleanup (effort: light) — verify: `true`\n');

  const alphaCheck = run(dir, ['check', '--trust', '--record', 'alpha verified', '--quiet'], { env: envA });
  assert.match(alphaCheck.stdout, /alpha: ready → run `keelson land alpha`/);
  assert.match(read(dir, '.keelson/changes/alpha/ledger.md'), /alpha verified/);
  assert.ok(!exists(dir, '.keelson/changes/beta/ledger.md'));

  const statusA = JSON.parse(run(dir, ['status', '--json'], { env: envA }).stdout);
  assert.equal(statusA.focus, 'alpha');
  assert.equal(statusA.changes.find((c) => c.name === 'alpha').work, 'ready');

  // Landing is a lifecycle transition, not something that waits for the user to say "done",
  // and it does not wait for a stale planning checkbox either.
  const landedAlpha = run(dir, ['land'], { env: envA });
  assert.match(landedAlpha.stdout, /tasks are planning notes, not landing gates/);
  assert.ok(!exists(dir, '.keelson/changes/alpha'));
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envA }).stdout).focus, null);

  // Another conversation remains isolated on its own work item.
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envB }).stdout).focus, 'beta');
  assert.ok(exists(dir, '.keelson/changes/beta/change.md'));

  // A new session does not complete or cancel durable work; it may deliberately resume the sole candidate.
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envC }).stdout).focus, null);
  run(dir, ['focus', '--auto'], { env: envC });
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envC }).stdout).focus, 'beta');

  // Losing/clearing the conversation pointer never changes durable work.
  run(dir, ['focus', '--clear'], { env: envB });
  assert.ok(exists(dir, '.keelson/changes/beta/change.md'));
  assert.equal(JSON.parse(run(dir, ['focus', '--json'], { env: envB }).stdout).focus, null);

  // No native identity: suggest the unique candidate but refuse to create a shared/global focus.
  const degraded = JSON.parse(run(dir, ['focus', '--auto', '--json'], { env }).stdout);
  assert.equal(degraded.available, false);
  assert.equal(degraded.focus, null);
  assert.equal(degraded.suggested, 'beta');
});

test('spec changes do not invent alternatives when there is no material fork', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'follow-existing-pattern', '--tier', 'spec', '--capability', 'orders'], { env });
  const change = read(dir, '.keelson/changes/follow-existing-pattern/change.md');
  assert.doesNotMatch(change, /^## Alternatives$/m);
  const validation = JSON.parse(run(dir, ['validate', '--json'], { env }).stdout);
  assert.equal(validation.ok, true);
  assert.ok(!validation.errors.some((e) => /Alternatives/.test(e)));
});

test('depends is a real lifecycle gate for status and land', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'base-work'], { env });
  run(dir, ['new', 'child-work', '--depends', 'base-work'], { env });
  for (const name of ['base-work', 'child-work']) {
    write(dir, `.keelson/changes/${name}/change.md`, read(dir, `.keelson/changes/${name}/change.md`).replace('- [ ] … — check: `…`', '- [x] works — check: `true`'));
    write(dir, `.keelson/changes/${name}/ledger.md`, '### Verify: ok\n`true` exit 0\n');
  }
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout);
  const child = st.changes.find((x) => x.name === 'child-work');
  assert.equal(child.work, 'in-progress');
  assert.deepEqual(child.blockedBy, ['base-work']);
  assert.ok(child.gates.some((g) => g.code === 'dependencies' && g.pass === false));
  const refused = run(dir, ['land', 'child-work'], { env, allowFail: true });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /depends on active change\(s\): base-work/);
});

test('large logical specs auto-shard without user maintenance', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', read(dir, '.keelson/config.yaml').replace('spec: 250', 'spec: 12'));
  run(dir, ['new', 'grow-orders', '--tier', 'quick', '--capability', 'orders'], { env });
  write(dir, '.keelson/changes/grow-orders/change.md', read(dir, '.keelson/changes/grow-orders/change.md')
    .replace('- [ ] … — check: `…`', '- [x] works — check: `true`')
    .replace(/\n*$/, '\n\n## Decisions\n- orders: keep capability-local decisions individually addressable\n- orders: prefer bounded physical files over one growing monolith\n'));
  write(dir, '.keelson/changes/grow-orders/ledger.md', '### Verify: ok\n`true` exit 0\n');
  write(dir, '.keelson/changes/grow-orders/specs/orders/spec.md', [
    '---',
    'base: new',
    '---',
    '## ADDED Requirements',
    '### Requirement: Create',
    'Create works.',
    '#### Scenario: create',
    '- WHEN create',
    '- THEN created',
    '### Requirement: Read',
    'Read works.',
    '#### Scenario: read',
    '- WHEN read',
    '- THEN returned',
    '### Requirement: Revoke',
    'Revoke works.',
    '#### Scenario: revoke',
    '- WHEN revoke',
    '- THEN refused',
    ''
  ].join('\n'));
  recordFixture(dir, 'grow-orders');
  const landed = run(dir, ['land', 'grow-orders'], { env });
  assert.match(landed.stdout, /auto-organize/);
  assert.match(read(dir, '.keelson/specs/orders/spec.md'), /^layout: sharded$/m);
  assert.ok(exists(dir, '.keelson/specs/orders/requirements/create.md'));
  assert.ok(exists(dir, '.keelson/specs/orders/requirements/read.md'));
  assert.ok(exists(dir, '.keelson/specs/orders/requirements/revoke.md'));
  assert.match(read(dir, '.keelson/specs/orders/spec.md'), /^decisions_dir: decisions$/m);
  const decisionFiles = fs.readdirSync(path.join(dir, '.keelson/specs/orders/decisions')).filter((f) => f.endsWith('.md'));
  assert.equal(decisionFiles.length, 2);
  assert.match(read(dir, path.join('.keelson/specs/orders/decisions', decisionFiles[0])), /## Decisions/);
  assert.equal(JSON.parse(run(dir, ['validate', '--json'], { env }).stdout).ok, true);

  // A later change hashes and edits the whole logical contract, not just the index.
  run(dir, ['new', 'extend-orders', '--tier', 'spec', '--capability', 'orders'], { env });
  assert.match(read(dir, '.keelson/changes/extend-orders/specs/orders/spec.md'), /^base: [0-9a-f]{10}$/m);
});

test('auto-sharding preserves pre-existing unmanaged requirements directories', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', read(dir, '.keelson/config.yaml').replace('spec: 250', 'spec: 10'));
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: Existing\nold\n### Scenario: existing\n- WHEN old\n- THEN kept\n');
  write(dir, '.keelson/specs/orders/requirements/manual.md', '# user-owned\nkeep me\n');
  run(dir, ['new', 'extend-existing', '--tier', 'quick', '--capability', 'orders'], { env });
  write(dir, '.keelson/changes/extend-existing/change.md', read(dir, '.keelson/changes/extend-existing/change.md').replace('- [ ] … — check: `…`', '- [x] works — check: `true`'));
  write(dir, '.keelson/changes/extend-existing/ledger.md', '### Verify: ok\n`true` exit 0\n');
  const deltaPath = '.keelson/changes/extend-existing/specs/orders/spec.md';
  const base = read(dir, deltaPath).match(/^base: (\S+)/m)[1];
  write(dir, deltaPath, [
    '---',
    `base: ${base}`,
    '---',
    '## ADDED Requirements',
    '### Requirement: Added',
    'new',
    '#### Scenario: added',
    '- WHEN new',
    '- THEN present',
    '',
    '## MODIFIED Requirements',
    '',
    '## REMOVED Requirements',
    ''
  ].join('\n'));
  recordFixture(dir, 'extend-existing');
  run(dir, ['land', 'extend-existing'], { env });
  assert.equal(read(dir, '.keelson/specs/orders/requirements/manual.md'), '# user-owned\nkeep me\n');
  assert.match(read(dir, '.keelson/specs/orders/spec.md'), /^requirements_dir: keelson-requirements$/m);
  assert.ok(exists(dir, '.keelson/specs/orders/keelson-requirements/existing.md'));
  assert.ok(exists(dir, '.keelson/specs/orders/keelson-requirements/added.md'));
});

test('legacy sharded decision files migrate to bounded decision shards without touching neighbors', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', read(dir, '.keelson/config.yaml').replace('spec: 250', 'spec: 12'));
  write(dir, '.keelson/specs/orders/spec.md', [
    '---',
    'layout: sharded',
    'requirements_dir: requirements',
    'decisions_file: decisions.md',
    '---',
    '# orders',
    '',
    '## Purpose',
    'Orders.',
    ''
  ].join('\n'));
  write(dir, '.keelson/specs/orders/requirements/existing.md', '# Existing\n\n## Requirement: Existing\n\nold\n### Scenario: existing\n- WHEN old\n- THEN kept\n');
  write(dir, '.keelson/specs/orders/decisions.md', '# Decisions — orders\n\n## Decisions\n\n- orders: existing durable rationale\n');
  write(dir, '.keelson/specs/orders/decisions/manual.md', '# project-owned neighbor\nkeep me\n');

  run(dir, ['new', 'migrate-decisions', '--tier', 'quick', '--capability', 'orders'], { env });
  write(dir, '.keelson/changes/migrate-decisions/change.md', read(dir, '.keelson/changes/migrate-decisions/change.md').replace('- [ ] … — check: `…`', '- [x] works — check: `true`'));
  write(dir, '.keelson/changes/migrate-decisions/ledger.md', '### Verify: ok\n`true` exit 0\n');
  const deltaPath = '.keelson/changes/migrate-decisions/specs/orders/spec.md';
  const base = read(dir, deltaPath).match(/^base: (\S+)/m)[1];
  write(dir, deltaPath, [
    '---',
    `base: ${base}`,
    '---',
    '## ADDED Requirements',
    '### Requirement: Added',
    'new',
    '#### Scenario: added',
    '- WHEN new',
    '- THEN present',
    '',
    '## MODIFIED Requirements',
    '',
    '## REMOVED Requirements',
    ''
  ].join('\n'));

  recordFixture(dir, 'migrate-decisions');
  run(dir, ['land', 'migrate-decisions'], { env });
  const index = read(dir, '.keelson/specs/orders/spec.md');
  assert.match(index, /^decisions_dir: keelson-decisions$/m);
  assert.doesNotMatch(index, /^decisions_file:/m);
  assert.equal(exists(dir, '.keelson/specs/orders/decisions.md'), false);
  assert.equal(read(dir, '.keelson/specs/orders/decisions/manual.md'), '# project-owned neighbor\nkeep me\n');
  const shards = fs.readdirSync(path.join(dir, '.keelson/specs/orders/keelson-decisions')).filter((f) => f.endsWith('.md'));
  assert.equal(shards.length, 1);
  assert.match(read(dir, path.join('.keelson/specs/orders/keelson-decisions', shards[0])), /existing durable rationale/);
});

test('hard knowledge limits fail validate and preflight land before writing specs', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', read(dir, '.keelson/config.yaml').replace('INTENT: 120', 'INTENT: 5').replace('spec: 250', 'spec: 6'));
  write(dir, '.keelson/INTENT.md', '# intent\n' + 'truth\n'.repeat(11));
  const invalid = run(dir, ['validate', '--json'], { env, allowFail: true });
  assert.equal(invalid.code, 1);
  assert.ok(JSON.parse(invalid.stdout).errors.some((e) => /budget-hard: INTENT\.md/.test(e)));

  // Restore INTENT so the landing assertion isolates projected spec growth.
  write(dir, '.keelson/INTENT.md', '# intent\nsmall\n');
  run(dir, ['new', 'bounded-spec', '--tier', 'quick', '--capability', 'orders'], { env });
  write(dir, '.keelson/changes/bounded-spec/change.md', read(dir, '.keelson/changes/bounded-spec/change.md').replace('- [ ] … — check: `…`', '- [x] works — check: `true`'));
  write(dir, '.keelson/changes/bounded-spec/ledger.md', '### Verify: ok\n`true` exit 0\n');
  write(dir, '.keelson/changes/bounded-spec/specs/orders/spec.md', [
    '---',
    'base: new',
    '---',
    '## ADDED Requirements',
    '### Requirement: Large bounded contract',
    'The API SHALL stay bounded.',
    '#### Scenario: one',
    '- WHEN a',
    '- THEN b',
    '#### Scenario: two',
    '- WHEN c',
    '- THEN d',
    '#### Scenario: three',
    '- WHEN e',
    '- THEN f',
    '#### Scenario: four',
    '- WHEN g',
    '- THEN h',
    ''
  ].join('\n'));
  recordFixture(dir, 'bounded-spec');
  const refused = run(dir, ['land', 'bounded-spec'], { env, allowFail: true });
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /auto-sharding still leaves oversized spec shard/);
  assert.ok(!exists(dir, '.keelson/specs/orders/spec.md'), 'budget refusal must happen before any durable spec write');
});

test('runtime sessions live outside the project', async () => {
  const { runtimeDir } = await import('../src/lib/runtime-path.js'); const dir = tmpProject({}); execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env }); run(dir, ['new', 'runtime-work'], { env: { ...env, KEELSON_SESSION_ID: 'runtime-session' } }); assert.ok(fs.existsSync(runtimeDir(dir))); assert.ok(!exists(dir, '.keelson/.runtime'));
});
test('handoff and session hook tolerate CRLF files', () => {
  const dir = tmpProject({});
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'init'], { cwd: dir });
  run(dir, ['init', '--tools', 'claude'], { env });
  run(dir, ['new', 'crlf-handoff'], { env });
  run(dir, ['handoff', 'crlf-handoff', '--by', 'Ann'], { env });
  const file = '.keelson/changes/crlf-handoff/handoff.md';
  const crlf = read(dir, file)
    .replace(/\n/g, '\r\n')
    .replace(/## Next step\r\n…/, '## Next step\r\nContinue from CRLF.');
  write(dir, file, crlf);
  run(dir, ['handoff', 'crlf-handoff', '--by', 'Ann'], { env });
  const restamped = read(dir, file);
  assert.equal((restamped.match(/^---\r?$/gm) || []).length, 2);
  const ctx = JSON.parse(run(dir, ['context', '--json'], { env }).stdout);
  assert.equal(ctx.changes.find((c) => c.name === 'crlf-handoff').handoffNext.trim(), 'Continue from CRLF.');
});

test('ablate removes every surface and restore brings it back byte-for-byte', () => {
  const dir = tmpProject({ 'CLAUDE.md': '# Mine\n' });
  run(dir, ['init', '--tools', 'claude'], { env });
  const before = read(dir, 'CLAUDE.md');
  run(dir, ['ablate'], { env });
  assert.ok(!exists(dir, '.keelson'));
  assert.ok(!exists(dir, '.claude/skills/keelson'));
  assert.equal(read(dir, 'CLAUDE.md'), '# Mine\n');
  run(dir, ['restore'], { env });
  assert.equal(read(dir, 'CLAUDE.md'), before);
  assert.ok(exists(dir, '.keelson/config.yaml'));
});

test('ablate and restore preserve zero-copy host configuration', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'opencode,codebuddy', '--hooks'], { env }); run(dir, ['ablate'], { env }); run(dir, ['restore'], { env });
  assert.ok(!exists(dir, '.opencode/plugins/keelson-session.js')); assert.match(read(dir, '.codebuddy/settings.json'), /keelson hook codebuddy-session/);
});
test('models resolves tiers and rank writes user overrides', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env });
  assert.equal(run(dir, ['models', '--resolve', 'light'], { env }).stdout.trim(), 'haiku');
  run(dir, ['models', 'rank', 'fable', 'deep'], { env });
  assert.equal(run(dir, ['models', '--resolve', 'deep'], { env }).stdout.trim(), 'fable');
  const bad = run(dir, ['models', 'rank', 'claude-opus-4-20250514', 'deep'], { env, allowFail: true });
  assert.equal(bad.code, 1);
});

test('retro reads ledgers and reports metrics', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'r'], { env });
  write(dir, '.keelson/changes/r/ledger.md', '### Root cause: cross-layer\nx\n### Root cause: cross-layer\ny\n### Root cause: cross-layer\nz\n### Dispatch: task 1 → light (h)\nResult: pass\n');
  const j = JSON.parse(run(dir, ['retro', '--json'], { env }).stdout);
  assert.equal(j.metrics.rootCauses['cross-layer'], 3);
  assert.equal(j.metrics.byTier.light.dispatches, 1);
  assert.ok(j.suggestions.some((s) => s.kind === 'rule'));
  assert.ok(j.guidance.some((g) => g.id === 'debug.reproduce-first'));
});


test('the user-level ~/.keelson is never mistaken for a project root', async () => {
  const { findProjectRoot } = await import('../src/lib/paths.js');
  const home = tmpProject({ '.keelson/models.cache.json': '{}' });
  const nested = path.join(home, 'work', 'proj');
  fs.mkdirSync(nested, { recursive: true });
  const prev = process.env.HOME;
  process.env.HOME = home;
  try {
    assert.equal(findProjectRoot(nested), null);
  } finally {
    process.env.HOME = prev;
  }
});

test('top-level help separates the human golden path from agent mechanics', () => {
  const dir = tmpProject({});
  const out = run(dir, ['--help'], { env }).stdout;
  assert.match(out, /Normal use: run `keelson init` once/);
  assert.match(out, /Your commands:/);
  assert.match(out, /Agent workflow:/);
  assert.match(out, /Maintenance \/ advanced:/);
});

test('per-command --help prints that command only', () => {
  const dir = tmpProject({});
  const out = run(dir, ['new', '--help'], { env }).stdout;
  assert.match(out, /^Usage: keelson new <name>/);
  assert.doesNotMatch(out, /keelson land/);
});

test('init references project material without changing .gitignore', () => {
  const dir = tmpProject({ 'ARCHITECTURE.md': '# arch', '.gitignore': 'node_modules\n' }); const before = read(dir, '.gitignore');
  run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env }); assert.match(read(dir, '.keelson/config.yaml'), /architecture: ARCHITECTURE.md/); assert.equal(read(dir, '.gitignore'), before);
});
test('update migrates a v1 config and --dry-run writes nothing', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/config.yaml', 'version: 1\ntools:\n  - claude\ncheck:\n  - echo hi\n');
  const dry = run(dir, ['update', '--dry-run'], { env }).stdout;
  assert.match(dry, /migrate\s+\.keelson\/config\.yaml v1 → v4/);
  assert.match(read(dir, '.keelson/config.yaml'), /^version: 1$/m);
  run(dir, ['update'], { env });
  const cfg = read(dir, '.keelson/config.yaml');
  assert.match(cfg, /^version: 4$/m);
  assert.match(cfg, /- echo hi/);
  assert.match(cfg, /budgets:/);
  assert.match(cfg, /specs: \.keelson\/specs/);
});

test('status exposes shared contracts and impact lists importers', () => {
  const dir = tmpProject({ 'src/api/orders.js': 'export const a = 1;\n', 'src/web.js': "import { a } from './api/orders.js';\n" });
  execFileSync('git', ['init', '-q'], { cwd: dir });
  run(dir, ['init', '--no-hooks'], { env });
  write(dir, '.keelson/specs/orders/spec.md', '# orders\n\n## Requirement: L\nl\n### Scenario: s\n- WHEN\n- THEN\n');
  run(dir, ['new', 'a', '--tier', 'spec', '--capability', 'orders'], { env });
  run(dir, ['new', 'b', '--tier', 'spec', '--capability', 'orders'], { env });
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout);
  assert.equal(st.conflicts.length, 1);
  assert.deepEqual(st.conflicts[0].capabilities, ['orders']);
  write(dir, '.keelson/changes/a/tasks.md', '- [x] 1. x (effort: light)\n');
  write(dir, '.keelson/changes/a/change.md', read(dir, '.keelson/changes/a/change.md').replace(/^status:.*$/m, 'status: in-progress').replace(/## Acceptance[\s\S]*?## Open questions/, '## Acceptance\n- [x] ok — check: `true`\n\n## Open questions').replace(/## How\n…/, '## How\nh').replace(/## Alternatives[\s\S]*?## Impact/, '## Alternatives\n- **x (chosen)** — a\n- **y** — strongest: b. Rejected because: c\n\n## Impact').replace(/## Decisions[\s\S]*$/, '## Decisions\n- orders: x over y; y rejected because c\n'));
  write(dir, '.keelson/changes/a/ledger.md', '### Verify: ok\n`true` exit 0\n');
  recordFixture(dir, 'a');
  const landed = run(dir, ['land', 'a', '--dry-run'], { env }).stdout;
  assert.match(landed, /shared contract with active change b/);
  const im = JSON.parse(run(dir, ['impact', 'src/api/orders.js', '--json'], { env }).stdout);
  assert.deepEqual(im.callers, ['src/web.js']);
  assert.equal(im.specs[0].capability, 'orders');
  assert.equal(im.activeChanges.length, 2);
});

test('handoff is an explicit transfer artifact and remains readable after session changes', () => {
  const dir = tmpProject({});
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'init'], { cwd: dir });
  run(dir, ['init', '--tools', 'claude'], { env });
  run(dir, ['new', 'share-links'], { env });
  run(dir, ['handoff', 'share-links', '--by', 'Ann'], { env });
  const h = read(dir, '.keelson/changes/share-links/handoff.md');
  assert.match(h, /^at: [0-9a-f]{7,}$/m);
  assert.match(h, /^by: Ann$/m);
  write(dir, '.keelson/changes/share-links/handoff.md', h.replace(/## Next step\n…/, '## Next step\nWire the revoke endpoint.'));
  const ctx = JSON.parse(run(dir, ['context', '--json'], { env }).stdout);
  assert.equal(ctx.changes.find((c) => c.name === 'share-links').handoffNext.trim(), 'Wire the revoke endpoint.');
  const st = JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0];
  assert.equal(st.handoff.headMoved, false);
  execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=Ann', 'commit', '--allow-empty', '-qm', 'moved'], { cwd: dir });
  assert.equal(JSON.parse(run(dir, ['status', '--json'], { env }).stdout).changes[0].handoff.headMoved, true);
});

test('uninstall removes owned default surfaces without requiring a vendored runtime', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude', '--no-hooks'], { env }); run(dir, ['uninstall'], { env });
  assert.ok(!exists(dir, '.claude/skills/keelson')); assert.ok(!exists(dir, '.keelson/skill')); assert.ok(exists(dir, '.keelson/INTENT.md'));
});
test('breaking change without Rollout is refused at landing', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--no-hooks'], { env });
  run(dir, ['new', 'drop-v1'], { env });
  write(dir, '.keelson/changes/drop-v1/change.md', '---\ntier: quick\ncreated: 2026-01-01\n---\n# Drop v1\n\n## Why\nw\n\n## What\n- **BREAKING** remove /v1\n\n## Acceptance\n- [x] gone — check: `true`\n');
  write(dir, '.keelson/changes/drop-v1/tasks.md', '- [x] 1. a (effort: light)\n');
  write(dir, '.keelson/changes/drop-v1/ledger.md', '### Verify: ok\n`true` exit 0\n');
  assert.match(run(dir, ['land'], { env, allowFail: true }).stderr, /BREAKING.*Rollout/);
});

test('guide flag persists and guide command renders its guided workflow', () => {
  const dir = tmpProject({}); run(dir, ['init', '--guide', '--no-hooks'], { env }); assert.match(read(dir, '.keelson/config.yaml'), /^guide: true$/m);
  assert.match(run(dir, ['guide', 'workflow'], { env }).stdout, /Guided mode:/); assert.ok(!exists(dir, '.keelson/workflow.md'));
});
test('multi-host init creates only selected discovery shims', () => {
  const dir = tmpProject({}); run(dir, ['init', '--tools', 'claude,opencode,kiro', '--no-hooks'], { env });
  for (const shim of ['.claude/skills/keelson/SKILL.md', '.kiro/skills/keelson/SKILL.md']) assert.match(read(dir, shim), /keelson guide/);
  assert.ok(!exists(dir, '.keelson/skill')); assert.ok(!exists(dir, '.keelson/workflow.md'));
});
