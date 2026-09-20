import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { tmpProject, run, read, write } from './helpers.js';

test('ablation restricts recovery access before preserving and restoring user content', {
  skip: process.platform === 'win32' ? 'POSIX directory permissions do not establish Windows ACLs' : false,
}, () => {
  const taskHome = tmpProject({});
  const dir = tmpProject({});
  const env = { HOME: taskHome };
  run(dir, ['init', '--codex', '--no-hooks'], { env });
  write(dir, '.keelson/private-note.md', 'private project fact\n');
  const key = crypto.createHash('sha1').update(dir).digest('hex').slice(0, 12);
  const stash = path.join(taskHome, '.keelson', 'ablations', key);
  fs.mkdirSync(stash, { recursive: true });
  fs.chmodSync(stash, 0o755);
  run(dir, ['ablate'], { env });
  assert.equal(fs.statSync(stash).mode & 0o777, 0o700);
  assert.equal(fs.readFileSync(path.join(stash, 'files/.keelson/private-note.md'), 'utf8'), 'private project fact\n');
  run(dir, ['restore'], { env });
  assert.equal(read(dir, '.keelson/private-note.md'), 'private project fact\n');
  assert.ok(!fs.existsSync(stash));
});
