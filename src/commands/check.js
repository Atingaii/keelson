import { spawnSync } from 'node:child_process';
import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadConfig } from '../lib/config.js';
import { ok, fail, warn, heading } from '../lib/out.js';

export async function check({ flags }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  const cfg = loadConfig(projectPaths(root).config);
  const cmds = cfg.check ?? [];
  if (!cmds.length) {
    warn('no check commands configured. Add them under `check:` in .keelson/config.yaml, e.g. `- npm test`.');
    return 0;
  }
  heading(`keelson check — ${cmds.length} command${cmds.length > 1 ? 's' : ''}`);
  const results = [];
  for (const cmd of cmds) {
    const r = spawnSync(cmd, { cwd: root, shell: true, stdio: flags.quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
    const code = r.status ?? 1;
    results.push({ cmd, exit: code });
    (code === 0 ? ok : fail)(`\`${cmd}\` exit ${code}`);
  }
  const failed = results.filter((r) => r.exit !== 0);
  if (flags.json) console.log(JSON.stringify({ ok: !failed.length, results }, null, 2));
  console.log('');
  console.log(failed.length ? `${failed.length} failed` : 'all checks passed');
  console.log('Ledger line:');
  console.log(`### Verify: <claim>\n${results.map((r) => `\`${r.cmd}\` exit ${r.exit}`).join('; ')}`);
  return failed.length ? 1 : 0;
}
