import path from 'node:path';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadAllChanges, loadChange } from '../lib/changes.js';
import { readOr } from '../lib/fs.js';
import { verificationStatus } from '../lib/lifecycle.js';
import { worktreeFingerprint } from '../lib/git.js';

export async function attest({ positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const p = projectPaths(root);
  const changes = loadAllChanges(p.changes);
  const name = positional[0] ?? (changes.length === 1 ? changes[0].name : null);
  if (!name) throw new Error('usage: keelson attest <change>');
  const c = loadChange(p.changes, name) ?? loadChange(p.archive, name);
  if (!c) throw new Error(`no change named ${name}`);
  const verification = verificationStatus(c, worktreeFingerprint(root));
  const envelopes = readOr(path.join(c.dir, 'ledger.jsonl')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  console.log(JSON.stringify({ change: name, verification, trust: 'local-machine; exported key is not an independent trust anchor', publicKey: readOr(path.join(c.dir, 'evidence', 'public-key.pem')), envelopes }, null, 2));
  return verification.state === 'passed' ? 0 : 1;
}
