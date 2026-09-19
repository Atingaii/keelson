import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globMatch } from '../src/lib/glob.js';

test('** matches nested paths', () => {
  assert.ok(globMatch('src/api/**', 'src/api/orders.js'));
  assert.ok(globMatch('src/api/**', 'src/api/v2/orders.js'));
  assert.ok(!globMatch('src/api/**', 'src/web/orders.js'));
});
test('* stays within a segment', () => {
  assert.ok(globMatch('src/*.js', 'src/a.js'));
  assert.ok(!globMatch('src/*.js', 'src/x/a.js'));
});
test('braces and ?', () => {
  assert.ok(globMatch('**/*.{ts,tsx}', 'a/b/c.tsx'));
  assert.ok(globMatch('file?.md', 'file1.md'));
  assert.ok(!globMatch('file?.md', 'file12.md'));
});
test('directory-style globs match beneath', () => {
  assert.ok(globMatch('src/api', 'src/api/x.js'));
  assert.ok(globMatch('src/api/', 'src/api/x.js'));
  assert.ok(!globMatch('src/api', 'src/apix/x.js'));
});
test('** alone matches everything', () => {
  assert.ok(globMatch('**', 'anything/at/all.txt'));
});
