import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { tmpProject, write } from './helpers.js';
import { worktreeFingerprint } from '../src/lib/git.js';

const git = (root, args, options = {}) => execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options }).trim();
const contentDigest = (value) => crypto.createHash('sha256').update(value).digest();

function records(bytes) {
  const result = [];
  for (let start = 0; start < bytes.length;) {
    const end = bytes.indexOf(0, start);
    if (end === -1) break;
    result.push(bytes.subarray(start, end));
    start = end + 1;
  }
  return result;
}

function legacyV2Fingerprint(root) {
  const entries = [];
  for (const [args, kind] of [
    [['ls-files', '-s', '-z'], 'tracked'],
    [['ls-files', '--others', '--exclude-standard', '-z'], 'untracked'],
  ]) {
    for (const record of records(execFileSync('git', args, { cwd: root }))) {
      const tab = kind === 'tracked' ? record.indexOf(0x09) : -1;
      const rawFile = tab === -1 ? record : record.subarray(tab + 1);
      if (rawFile.length) entries.push({ kind, rawFile, file: path.join(root, rawFile.toString('utf8')) });
    }
  }
  entries.sort((a, b) => Buffer.compare(a.rawFile, b.rawFile) || a.kind.localeCompare(b.kind));
  const regular = entries.filter((entry) => fs.lstatSync(entry.file).isFile());
  const direct = regular.filter((entry) => entry.file.includes('\n'));
  const batched = regular.filter((entry) => !entry.file.includes('\n'));
  const digests = new Map(direct.map((entry) => [entry, contentDigest(fs.readFileSync(entry.file))]));
  if (batched.length) {
    const output = execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], {
      cwd: root,
      input: Buffer.from(`${batched.map((entry) => entry.file).join('\n')}\n`),
      encoding: 'utf8',
    }).trim().split('\n');
    batched.forEach((entry, index) => digests.set(entry, Buffer.from(output[index], 'ascii')));
  }
  const hash = crypto.createHash('sha256').update('keelson-worktree-v2\0');
  const field = (value) => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
    const length = Buffer.allocUnsafe(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(length).update(bytes);
  };
  for (const entry of entries) {
    const stat = fs.lstatSync(entry.file);
    field(entry.kind);
    field(entry.rawFile);
    if (stat.isDirectory()) {
      field('gitlink');
      field(git(entry.file, ['rev-parse', '--verify', 'HEAD']) || 'missing');
    } else if (stat.isSymbolicLink()) {
      field('symlink');
      field(contentDigest(fs.readlinkSync(entry.file, { encoding: 'buffer' })));
    } else if (stat.isFile()) {
      field('file');
      field(stat.mode & 0o111);
      field(digests.get(entry));
    } else {
      field('other');
      field(stat.mode);
    }
  }
  return hash.digest('hex');
}

test('slab framing preserves legacy v2 bytes across kinds and slab boundaries', (t) => {
  const root = tmpProject({ 'plain.js': 'export const one = 1;\n', 'large.txt': Buffer.alloc(1024 * 1024, 0x61) });
  if (process.platform !== 'win32') {
    write(root, 'line\nbreak.js', 'export const newline = true;\n');
    write(root, 'tracked\tname.js', 'export const tab = true;\n');
    fs.symlinkSync('plain.js', path.join(root, 'link'));
  }
  const nested = path.join(root, 'nested');
  fs.mkdirSync(nested);
  git(nested, ['init', '-q']);
  write(nested, 'nested.js', 'export const nested = 1;\n');
  git(nested, ['add', '.']);
  git(nested, ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'nested'], { env: { ...process.env, GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' } });
  for (let index = 0; index < 5600; index++) write(root, `many/${String(index).padStart(4, '0')}.js`, `export const n${index} = ${index};\n`);
  git(root, ['init', '-q']);
  git(root, ['add', '.']);
  if (process.platform !== 'win32') write(root, 'untracked\tname.js', 'export const tab = false;\n');
  assert.equal(worktreeFingerprint(root), legacyV2Fingerprint(root));
  if (process.platform === 'win32') t.diagnostic('Win32 excludes newline, tab, and symlink names; regular, gitlink, large-file, and multi-slab framing remain covered.');
});
