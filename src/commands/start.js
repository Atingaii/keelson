import path from 'node:path';
import { requireProjectRoot } from '../lib/paths.js';
import { exists, read, write, writeJson, withLock } from '../lib/fs.js';
import { runtimeDir } from '../lib/runtime-path.js';
import { bindSession } from '../lib/session.js';
import { activeWorkflow, planningBlockers, planFingerprint, phaseContext } from '../lib/workflow.js';

export async function start({ positional = [], flags = {} }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  return withLock(path.join(runtimeDir(root), 'landing'), () => {
    const workflow = activeWorkflow(root, positional[0] ?? flags.change);
    const blockers = planningBlockers(workflow.change, workflow.changes);
    if (blockers.length) throw new Error(`cannot start implementation: ${blockers.join(' ')}`);
    const { change } = workflow;
    const pack = phaseContext(root, workflow); // Validate before changing state.
    const file = path.join(change.dir, 'change.md');
    const text = read(file);
    const updated = /^status:/m.test(text.split('\n---')[0])
      ? text.replace(/^status:.*$/m, 'status: in-progress')
      : text.replace(/^---\r?\n/, '---\nstatus: in-progress\n');
    write(file, updated);
    writeJson(path.join(change.dir, 'execution.json'), { schema: 1, plan: planFingerprint(change), startedAt: new Date().toISOString() });
    bindSession(root, change.name, { source: 'start' });
    const contextFile = path.join(change.dir, 'context.json');
    if (!exists(contextFile)) {
      const files = pack.files.map(({ file }) => file.replace(' (including shards)', ''));
      writeJson(contextFile, { schema: 1, implement: files, check: files });
    }
    const result = { change: change.name, state: 'in-progress' };
    console.log(flags.json ? JSON.stringify(result) : `Started ${change.name}; follow \`keelson context --phase implement\` before editing.`);
    return 0;
  });
}
