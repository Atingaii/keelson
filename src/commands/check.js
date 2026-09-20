import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig, checkEntries } from '../lib/config.js';
import { write, mkdirp, readOr } from '../lib/fs.js';
import { loadAllChanges, loadChange } from '../lib/changes.js';
import { evaluateLifecycle } from '../lib/lifecycle.js';
import { worktreeFingerprint } from '../lib/git.js';
import { ok, fail, warn, heading, info } from '../lib/out.js';
import { readSession } from '../lib/session.js';
import { maintainRuntime } from '../lib/maintenance.js';
import { changeSpecDrift } from '../lib/specs.js';

export function verifyLine(claim, results, tree) {
  return `### Verify: ${claim}\n${results.map((r) => `\`${r.cmd}\` exit ${r.exit}`).join('; ')}${tree ? ` · tree ${tree}` : ''}`;
}

export async function check({ flags, positional }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  maintainRuntime(root);
  const cfg = loadConfig(projectPaths(root).config);
  const p = projectPaths(root, cfg);
  const entries = positional.length ? [{ name: positional.join(' '), command: positional.join(' '), kind: 'check' }] : checkEntries(cfg);
  const cmds = entries.map((e) => e.command);
  if (!cmds.length) {
    warn('no check commands configured. Add them under `check:` in .keelson/config.yaml, e.g. `- npm test`.');
    return 0;
  }
  heading(`keelson check — ${cmds.length} command${cmds.length > 1 ? 's' : ''}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  mkdirp(p.evidence);
  const results = [];
  for (const [i, entry] of entries.entries()) {
    const cmd = entry.command;
    const r = spawnSync(cmd, { cwd: root, shell: true, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    const code = r.status ?? 1;
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    if (!flags.quiet && out.trim()) process.stdout.write(out.endsWith('\n') ? out : out + '\n');
    const file = path.join(p.evidence, `${stamp}-${i + 1}.log`);
    write(file, `$ ${cmd}\nexit ${code}\n\n${out}`);
    results.push({ cmd, name: entry.name, kind: entry.kind, exit: code, evidence: path.relative(root, file) });
    (code === 0 ? ok : fail)(`${entry.name !== cmd ? `${entry.name} (${entry.kind}) ` : ''}\`${cmd}\` exit ${code}`);
  }
  const failed = results.filter((r) => r.exit !== 0);
  const tree = worktreeFingerprint(root);
  const claim = typeof flags.record === 'string' ? flags.record : failed.length ? 'checks failed' : 'checks pass';
  const line = verifyLine(claim, results, tree);
  console.log('');
  console.log(failed.length ? `${failed.length} failed` : 'all checks passed');
  if (flags.record !== undefined) {
    const all = loadAllChanges(p.changes);
    const focused = readSession(root).state?.change;
    const focusedActive = focused && all.some((c) => c.name === focused) ? focused : null;
    const name = flags.change ?? focusedActive ?? (all.length === 1 ? all[0].name : null);
    if (!name) {
      warn(all.length ? `several active changes (${all.map((c) => c.name).join(', ')}); bind this session with \`keelson focus <name>\` or pass --change <name>` : 'no active change to record into');
    } else {
      const ledger = path.join(p.changes, name, 'ledger.md');
      const cur = readOr(ledger, `# Ledger — ${name}\n`);
      write(ledger, `${cur.replace(/\n*$/, '\n')}\n${line}\n`);
      ok(`recorded in .keelson/changes/${name}/ledger.md`);
      const updated = loadChange(p.changes, name);
      const activeNames = new Set(loadAllChanges(p.changes).map((c) => c.name));
      const contractDrift = updated ? changeSpecDrift(updated, p.specs) : [];
      const lifecycle = updated ? evaluateLifecycle(updated, tree, { activeNames, contractDrift }) : null;
      if (lifecycle?.work === 'ready') ok(`${name}: ready → run \`keelson land ${name}\`; do not wait for the user to say "done"`);
      else if (lifecycle?.blockedBy.length) info(`${name}: verification passed, but lifecycle still waits on ${lifecycle.blockedBy.join(', ')}`);
    }
  } else {
    console.log('Ledger line (or re-run with --record to append it):');
    console.log(line);
  }
  info(`evidence: ${path.relative(root, p.evidence)}/${stamp}-*.log`);
  if (flags.json) console.log(JSON.stringify({ ok: !failed.length, tree, results }, null, 2));
  return failed.length ? 1 : 0;
}
