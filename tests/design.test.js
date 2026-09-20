import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, run, read } from './helpers.js';

const snapshot = (dir) => fs.readdirSync(dir, { recursive: true }).sort();

test('design catalog and every action load localized packaged guidance without project writes', () => {
  const dir = tmpProject({ 'untouched.txt': 'retain me' });
  const before = snapshot(dir);
  for (const lang of ['en', 'zh']) {
    const catalog = JSON.parse(run(dir, ['design', '--lang', lang, '--json']).stdout);
    assert.equal(catalog.kind, 'design-catalog');
    assert.equal(new Set(catalog.actions.map((a) => a.name)).size, catalog.actions.length);
    for (const action of catalog.actions) {
      const target = 'settings form; $(touch unexpected)';
      const brief = JSON.parse(run(dir, ['design', action.name, target, '--lang', lang, '--json']).stdout);
      assert.equal(brief.kind, 'design-brief');
      assert.equal(brief.action, action.name);
      assert.equal(brief.target, target);
      assert.equal(brief.lang, lang);
      assert.equal(brief.title, action.title);
      assert.equal(brief.references[0].name, 'frontend');
      assert.ok(brief.references.some((ref) => ref.name === action.reference));
      for (const ref of brief.references) {
        const content = run(dir, ['guide', ref.name, '--lang', lang]).stdout;
        assert.equal(ref.content, content);
        assert.match(content, /^# .+/m);
      }
      assert.match(brief.execution, lang === 'zh' ? /尚未执行/ : /no audit or modification has run/);
    }
  }
  assert.deepEqual(snapshot(dir), before);
  assert.equal(read(dir, 'untouched.txt'), 'retain me');
});

test('reference discovery lists readable names and respects saved project language', () => {
  const dir = tmpProject({});
  run(dir, ['init', '--tools', 'codex', '--lang', 'zh', '--no-hooks']);
  const before = snapshot(dir);
  const index = JSON.parse(run(dir, ['guide', '--list', '--json']).stdout);
  assert.equal(index.lang, 'zh');
  assert.equal(new Set(index.references.map((ref) => ref.name)).size, index.references.length);
  assert.ok(index.references.some((ref) => ref.name === 'frontend'));
  assert.ok(index.references.some((ref) => ref.name === 'workflow'));
  for (const reference of index.references) {
    assert.match(run(dir, ['guide', reference.name]).stdout, /^# .+/m);
    assert.ok(reference.title.length > 0);
  }
  const brief = JSON.parse(run(dir, ['design', 'harden', '设置表单', '--json']).stdout);
  assert.equal(brief.lang, 'zh');
  assert.equal(brief.mode, 'change');
  assert.match(brief.references[1].content, /保留可恢复输入/);
  assert.equal(JSON.parse(run(dir, ['design', 'audit', '--json']).stdout).mode, 'review');
  assert.equal(JSON.parse(run(dir, ['design', 'harden', '--lang', 'en', '--json']).stdout).lang, 'en');
  assert.deepEqual(snapshot(dir), before);
});

test('invalid design, reference and language inputs fail with recovery and no mutation', () => {
  const dir = tmpProject({ 'safe.txt': 'safe' });
  const before = snapshot(dir);
  for (const [args, message] of [
    [['design', 'unknown'], /keelson design/],
    [['design', 'audit', '--lang', 'invalid'], /en or zh/],
    [['guide', 'unknown'], /guide --list/],
    [['guide', '../package.json'], /simple name/],
    [['guide', '--list', 'frontend'], /not both/],
    [['guide', '--json'], /guide --list --json/],
    [['guide', 'frontend', 'extra'], /one reference/],
  ]) {
    const result = run(dir, args, { allowFail: true });
    assert.notEqual(result.code, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
  }
  assert.deepEqual(snapshot(dir), before);
});

test('help discovery is compact, command-specific and side-effect free', () => {
  const dir = tmpProject({});
  const before = snapshot(dir);
  const short = run(dir, ['--help']).stdout;
  const full = run(dir, ['--help', '--all']).stdout;
  assert.ok(short.length < full.length);
  assert.match(short, /Your commands:/);
  assert.match(short, /Agent workflow:/);
  assert.match(short, /keelson help <command>/);
  assert.match(full, /--touches globs/);
  assert.equal(run(dir, ['-h']).stdout, short);
  assert.equal(run(dir, ['-v']).stdout, run(dir, ['--version']).stdout);
  for (const command of ['init', 'new', 'design', 'guide', 'uninstall']) {
    const alias = run(dir, ['help', command]).stdout;
    assert.equal(alias, run(dir, [command, '--help']).stdout);
    assert.match(alias, new RegExp(`^Usage: keelson ${command}`));
    assert.equal(alias.split('Usage:').length, 2);
  }
  for (const args of [['typo'], ['help', 'typo'], ['typo', '--help'], ['toString'], ['help', '__proto__']]) {
    const result = run(dir, args, { allowFail: true });
    assert.equal(result.code, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /unknown command .*keelson --help/);
  }
  assert.deepEqual(snapshot(dir), before);
});

test('project documentation links resolve after consolidation', () => {
  const roots = ['README.md', 'README_CN.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
  const files = [...roots, ...fs.readdirSync('docs', { recursive: true }).filter((file) => file.endsWith('.md')).map((file) => path.join('docs', file))];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const [, destination] of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+[^)]*)?\)/g)) {
      if (/^(?:https?:|mailto:|#)/.test(destination)) continue;
      const pathname = decodeURIComponent(destination.split('#')[0]);
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), pathname)), `${file}: missing ${destination}`);
    }
  }
});
