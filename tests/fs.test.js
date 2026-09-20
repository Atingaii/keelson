import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withLock, write } from '../src/lib/fs.js';
import { tmpProject } from './helpers.js';

function simulateWindows(t) {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
  t.after(() => Object.defineProperty(process, 'platform', descriptor));
}

test('atomic replacement survives transient Windows sharing conflicts without removing old data', (t) => {
  const dir = tmpProject({ 'state.json': 'old complete state' });
  const file = path.join(dir, 'state.json');
  const rename = fs.renameSync;
  simulateWindows(t);
  let attempts = 0;
  t.mock.method(fs, 'renameSync', (from, to) => {
    assert.equal(fs.readFileSync(file, 'utf8'), 'old complete state');
    if (++attempts < 4) throw Object.assign(new Error('sharing violation'), { code: ['EPERM', 'EACCES', 'EBUSY'][attempts - 1] });
    return rename(from, to);
  });
  write(file, 'new complete state');
  assert.equal(attempts, 4);
  assert.equal(fs.readFileSync(file, 'utf8'), 'new complete state');
  assert.deepEqual(fs.readdirSync(dir), ['state.json']);
});

test('atomic replacement bounds sharing retries and preserves data on permanent failure', (t) => {
  const dir = tmpProject({ 'state.json': 'last good state' });
  const file = path.join(dir, 'state.json');
  simulateWindows(t);
  let attempts = 0;
  let clock = 1000;
  t.mock.method(Date, 'now', () => { clock += 400; return clock; });
  t.mock.method(fs, 'renameSync', () => {
    attempts++;
    throw Object.assign(new Error('sharing violation'), { code: 'EPERM' });
  });
  assert.throws(() => write(file, 'uncommitted state'), { code: 'EPERM' });
  assert.equal(attempts, 3);
  assert.equal(fs.readFileSync(file, 'utf8'), 'last good state');
  assert.deepEqual(fs.readdirSync(dir), ['state.json']);
});

test('atomic replacement does not retry unrelated write failures', (t) => {
  const dir = tmpProject({ 'state.json': 'last good state' });
  const file = path.join(dir, 'state.json');
  simulateWindows(t);
  let attempts = 0;
  t.mock.method(fs, 'renameSync', () => {
    attempts++;
    throw Object.assign(new Error('device error'), { code: 'EIO' });
  });
  assert.throws(() => write(file, 'uncommitted state'), { code: 'EIO' });
  assert.equal(attempts, 1);
  assert.equal(fs.readFileSync(file, 'utf8'), 'last good state');
  assert.deepEqual(fs.readdirSync(dir), ['state.json']);
});

test('lock acquisition tolerates transient Windows sharing conflicts without bypassing ownership', (t) => {
  const dir = tmpProject({});
  const file = path.join(dir, 'state.json');
  const open = fs.openSync;
  simulateWindows(t);
  let attempts = 0;
  let entered = 0;
  t.mock.method(fs, 'openSync', (...args) => {
    if (++attempts < 4) throw Object.assign(new Error('sharing violation'), { code: ['EPERM', 'EACCES', 'EBUSY'][attempts - 1] });
    return open(...args);
  });
  withLock(file, () => {
    entered++;
    assert.equal(fs.readFileSync(`${file}.lock`, 'utf8'), `${process.pid}\n`);
  });
  assert.equal(attempts, 4);
  assert.equal(entered, 1);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('persistent Windows sharing conflicts time out without removing another lock', (t) => {
  const dir = tmpProject({ 'state.json.lock': 'other writer' });
  const file = path.join(dir, 'state.json');
  simulateWindows(t);
  let clock = 1000;
  let entered = false;
  t.mock.method(Date, 'now', () => { clock += 400; return clock; });
  t.mock.method(fs, 'openSync', () => {
    throw Object.assign(new Error('sharing violation'), { code: 'EPERM' });
  });
  assert.throws(() => withLock(file, () => { entered = true; }, { timeout: 1000 }), /lock timeout/);
  assert.equal(entered, false);
  t.mock.restoreAll();
  assert.equal(fs.readFileSync(`${file}.lock`, 'utf8'), 'other writer');
});
