import { requireProjectRoot, projectPaths } from '../lib/paths.js';
import { loadAllChanges } from '../lib/changes.js';
import { readSession } from '../lib/session.js';
import { readDecisions, updateDecisions, decisionFrontier } from '../lib/decisions.js';
import path from 'node:path';
import { withLock } from '../lib/fs.js';
import { runtimeDir } from '../lib/runtime-path.js';

export async function ask(args, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  return withLock(path.join(runtimeDir(root), 'landing'), () => askUnlocked(args, cwd));
}

function askUnlocked({ positional, flags }, cwd) {
  const root = requireProjectRoot(cwd);
  const changes = loadAllChanges(projectPaths(root).changes);
  const name = flags.change ?? readSession(root).state?.change ?? (changes.length === 1 ? changes[0].name : null);
  const change = changes.find((c) => c.name === name);
  if (!change) throw new Error('choose an active change with --change <name>');
  const [action = 'frontier', id] = positional;
  const limit = flags.all ? Infinity : flags.limit === undefined ? 3 : Number(flags.limit);
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new Error('--limit must be a positive integer; use --all for the whole ready frontier');
  let data = readDecisions(change.dir);
  const text = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
    return value.trim();
  };
  if (action === 'add') {
    if (!id || !/^[\p{L}\p{N}_-]+$/u.test(id)) throw new Error('decision ID must be a nonempty word');
    const owner = flags.owner ?? 'user';
    if (!['user', 'agent', 'reality'].includes(owner)) throw new Error('--owner must be user, agent or reality');
    const question = text(flags.question, '--question');
    data = updateDecisions(change.dir, (doc) => {
      if (doc.decisions.some((d) => d.id === id || d.question.toLowerCase() === question.toLowerCase())) throw new Error('decision already recorded; reuse its ID');
      doc.decisions.push({ id, question, owner, state: 'open', depends: flags.depends ? String(flags.depends).split(',').map((v) => v.trim()).filter(Boolean) : [], irreversible: Boolean(flags.irreversible), recommended: typeof flags.recommend === 'string' ? flags.recommend : null, history: [] });
    });
  } else if (['settle', 'assume', 'reject', 'reopen'].includes(action)) {
    data = updateDecisions(change.dir, (doc) => {
      const d = doc.decisions.find((item) => item.id === id);
      if (!d) throw new Error(`unknown decision ${id}`);
      if (action === 'reopen') {
        const reason = text(flags.reason, '--reason');
        if (d.state === 'open') throw new Error(`${id} is already open`);
        d.history.push({ at: new Date().toISOString(), state: d.state, answer: d.answer ?? null, basis: d.basis ?? null, reason });
        d.state = 'open'; delete d.answer; delete d.basis;
      } else {
        if (d.state !== 'open') throw new Error(`${id} is ${d.state}; use reopen --reason before changing a settled answer`);
        if (!d.depends.every((dep) => doc.decisions.some((x) => x.id === dep && x.state === 'settled'))) throw new Error(`${id} has unresolved dependencies`);
        if (action === 'assume' && d.irreversible) throw new Error('irreversible decisions require settlement, not an assumption');
        d.basis = text(flags.basis ?? flags.reason, '--basis');
        d.answer = action === 'reject' ? null : text(flags.answer, '--answer');
        d.state = { settle: 'settled', assume: 'assumed', reject: 'rejected' }[action];
        d.history.push({ at: new Date().toISOString(), state: d.state, answer: d.answer, basis: d.basis });
      }
    });
  } else if (!['frontier', 'list'].includes(action)) throw new Error('usage: keelson ask <add|frontier|list|settle|assume|reject|reopen> [id] --change <name>');
  const result = action === 'list' ? data : decisionFrontier(data, limit);
  if (flags.json) console.log(JSON.stringify(result, null, 2));
  else if (action === 'list') for (const d of data.decisions) console.log(`${d.id} [${d.owner}/${d.state}] ${d.question}${d.answer ? ` → ${d.answer}` : ''}`);
  else {
    for (const d of result.questions) console.log(`${d.id}. ${d.question}${d.recommended ? ` (recommended: ${d.recommended})` : ''}`);
    if (result.remaining.length) console.log(`${result.remaining.length} more ready owner decision(s); use --all for a complex interview round.`);
    for (const d of result.investigate) console.log(`Investigate ${d.id} (${d.owner}): ${d.question}`);
    if (!result.questions.length) console.log(result.complete ? 'Decision frontier complete.' : 'No owner question is ready; resolve investigations, dependencies or assumptions.');
  }
  return 0;
}
