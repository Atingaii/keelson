import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { append, exists, read, readJson, walk, withLock, write } from './fs.js';
import { runtimeDir } from './runtime-path.js';
import { loadConfig, checkEntries } from './config.js';

const { version } = createRequire(import.meta.url)('../../package.json');
export const PAYLOAD_TYPE = 'application/vnd.in-toto+json';
export const VERIFICATION_TYPE = 'https://github.com/Atingaii/keelson/verification/v1';
export const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const pae = (type, payload) => Buffer.concat([Buffer.from(`DSSEv1 ${Buffer.byteLength(type)} ${type} ${payload.length} `), payload]);

export function contractFingerprint(root, changeDir) {
  const cfgPath = path.join(root, '.keelson', 'config.yaml');
  const cfg = loadConfig(cfgPath);
  const locations = [
    ['config', cfgPath], ['intent', path.join(root, '.keelson', 'INTENT.md')],
    ['specs', path.resolve(root, cfg.paths.specs)], ['rules', path.join(root, '.keelson', 'rules')],
    ['change', path.join(changeDir, 'change.md')], ['delta', path.join(changeDir, 'specs')],
    ['decisions', path.join(changeDir, 'decisions.json')],
  ];
  const hash = crypto.createHash('sha256');
  for (const [label, loc] of locations) {
    hash.update(label).update('\0');
    if (!exists(loc)) { hash.update('missing\0'); continue; }
    const stat = fs.lstatSync(loc);
    if (stat.isSymbolicLink()) throw new Error(`contract path must not be a symlink: ${loc}`);
    const files = stat.isDirectory() ? walk(loc) : [''];
    for (const rel of files) {
      const file = rel ? path.join(loc, rel) : loc;
      if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`contract path must not be a symlink: ${file}`);
      hash.update(rel).update('\0').update(fs.readFileSync(file)).update('\0');
    }
  }
  return hash.digest('hex');
}

function signingKey(root) {
  const keyFile = path.join(runtimeDir(root), 'attestation-key.pem');
  return withLock(keyFile, () => {
    if (!exists(keyFile)) {
      const { privateKey } = crypto.generateKeyPairSync('ed25519');
      write(keyFile, privateKey.export({ type: 'pkcs8', format: 'pem' }));
      fs.chmodSync(keyFile, 0o600);
    }
    return crypto.createPrivateKey(read(keyFile));
  });
}

export function recordStatement(root, dir, statement) {
  const privateKey = signingKey(root);
  const publicKey = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });
  const payload = Buffer.from(JSON.stringify(statement));
  const envelope = { payloadType: PAYLOAD_TYPE, payload: payload.toString('base64'), signatures: [{ keyid: sha256(publicKey), sig: crypto.sign(null, pae(PAYLOAD_TYPE, payload), privateKey).toString('base64') }] };
  // Exported keys permit independent cryptographic checking, not automatic trust.
  write(path.join(dir, 'evidence', 'public-key.pem'), publicKey);
  write(path.join(dir, 'evidence', 'keys', `${sha256(publicKey)}.pem`), publicKey);
  append(path.join(dir, 'ledger.jsonl'), `${JSON.stringify(envelope)}\n`);
  return envelope;
}

export function verificationStatement({ tree, contract, results, claim, startedOn, unchanged, complete, model = null, host = null }) {
  return {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: 'worktree', digest: { [tree.length === 40 ? 'gitTree' : 'sha256']: tree } }, { name: 'contract', digest: { sha256: contract } }],
    predicateType: VERIFICATION_TYPE,
    predicate: { claim, startedOn, finishedOn: new Date().toISOString(), unchanged, complete, runs: results, runner: { keelson: version, host, model, attribution: 'caller-supplied' } },
  };
}

/** Fail closed, using the last record (never search backwards for a passing run). */
export function inspectEvidence(root, dir) {
  const file = path.join(dir, 'ledger.jsonl');
  if (!exists(file)) return { state: 'not-run', detail: 'no structured record; run `keelson check --record`' };
  try {
    const lines = read(file).trim().split('\n');
    const envelopes = lines.map((line) => JSON.parse(line));
    const keyFile = path.join(runtimeDir(root), 'attestation-key.pem');
    if (!exists(keyFile)) return { state: 'untrusted', detail: 'record is from another machine; re-run `keelson check --record` here' };
    const key = crypto.createPublicKey(crypto.createPrivateKey(read(keyFile)));
    const keyid = sha256(key.export({ type: 'spki', format: 'pem' }));
    let statement;
    let locallyTrusted = false;
    for (const envelope of envelopes) {
      const payload = Buffer.from(envelope.payload ?? '', 'base64');
      const valid = envelope.payloadType === PAYLOAD_TYPE && envelope.signatures?.filter((sig) => {
        if (!/^[a-f0-9]{64}$/.test(sig.keyid)) return false;
        const exported = path.join(dir, 'evidence', 'keys', `${sig.keyid}.pem`);
        const publicKey = sig.keyid === keyid ? key : exists(exported) ? crypto.createPublicKey(read(exported)) : null;
        return publicKey && sha256(publicKey.export({ type: 'spki', format: 'pem' })) === sig.keyid && crypto.verify(null, pae(PAYLOAD_TYPE, payload), publicKey, Buffer.from(sig.sig, 'base64'));
      });
      if (!valid?.length) throw new Error('signature mismatch');
      const parsed = JSON.parse(payload);
      if (parsed._type !== 'https://in-toto.io/Statement/v1') throw new Error('unknown statement schema');
      if (parsed.predicateType === VERIFICATION_TYPE) { statement = parsed; locallyTrusted = valid.some((sig) => sig.keyid === keyid); }
    }
    if (!statement) return { state: 'not-run', detail: 'no verification statement' };
    if (!locallyTrusted) return { state: 'untrusted', detail: 'latest verification was signed elsewhere; re-run checks locally' };
    const p = statement.predicate;
    const tree = Object.values(statement.subject.find((s) => s.name === 'worktree')?.digest ?? {})[0];
    const contract = statement.subject.find((s) => s.name === 'contract')?.digest?.sha256;
    if (!tree || !contract || !Array.isArray(p.runs) || !p.runs.length) throw new Error('incomplete statement');
    for (const run of p.runs) {
      if (!/^[a-f0-9]{64}$/.test(run.logDigest)) throw new Error('invalid log digest');
      const log = path.join(dir, 'evidence', `${run.logDigest}.log`);
      if (!exists(log) || fs.lstatSync(log).isSymbolicLink() || sha256(fs.readFileSync(log)) !== run.logDigest) throw new Error('missing or modified evidence log');
    }
    if (p.runs.some((r) => r.exit !== 0)) return { state: 'failed', detail: 'at least one recorded check failed', tree, contract };
    if (!p.unchanged) return { state: 'stale', detail: 'worktree or contract changed during checking', tree, contract };
    const configured = checkEntries(loadConfig(path.join(root, '.keelson', 'config.yaml'))).map((e) => e.command);
    if (!p.complete || JSON.stringify(p.runs.map((r) => r.cmd)) !== JSON.stringify(configured)) return { state: 'partial', detail: 'record does not cover the configured check suite', tree, contract };
    if (contract !== contractFingerprint(root, dir)) return { state: 'stale', detail: 'contract changed after verification', tree, contract };
    return { state: 'passed', detail: 'locally signed record and log digests verified', tree, contract, statement };
  } catch (error) { return { state: 'invalid', detail: `${error.message}; restore the intact evidence bundle, then re-run checks` }; }
}

export function trustCommands(root, commands, trusted = false) {
  const file = path.join(runtimeDir(root), 'trusted-checks.json');
  const digest = sha256(JSON.stringify(commands));
  if (trusted) { write(file, JSON.stringify({ digest }) + '\n'); return; }
  if (readJson(file, null)?.digest !== digest) throw Object.assign(new Error(`check commands require local trust:\n${commands.map((c) => `  ${c}`).join('\n')}\nReview these commands, then run keelson check --trust --record. Trust is invalidated when commands change.`), { exitCode: 4 });
}
