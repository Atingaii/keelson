import path from 'node:path';
import { readJson, withLock, writeJson } from './fs.js';

export function readDecisions(dir) {
  const data = readJson(path.join(dir, 'decisions.json'), { schema: 1, decisions: [] });
  validateDecisionData(data);
  return data;
}

export function validateDecisionData(data) {
  if (!data || data.schema !== 1 || !Array.isArray(data.decisions)) throw new Error('unsupported decisions schema; expected schema 1 and decisions array');
  const ids = new Set();
  for (const d of data.decisions) {
    if (!d || typeof d.id !== 'string' || !/^[\p{L}\p{N}_-]+$/u.test(d.id) || ids.has(d.id)) throw new Error('decision IDs must be unique words');
    ids.add(d.id);
    if (!['user', 'agent', 'reality'].includes(d.owner) || !['open', 'settled', 'assumed', 'rejected'].includes(d.state) || typeof d.question !== 'string' || !d.question.trim() || !Array.isArray(d.depends)) throw new Error(`invalid decision ${d.id}`);
    if (!Array.isArray(d.history)) throw new Error(`${d.id}: history must be an array`);
    if (['settled', 'assumed'].includes(d.state) && (typeof d.answer !== 'string' || !d.answer.trim() || typeof d.basis !== 'string' || !d.basis.trim())) throw new Error(`${d.id}: answer and basis required`);
    if (d.irreversible && d.state === 'assumed') throw new Error(`${d.id}: irreversible decision cannot be assumed`);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(d) {
    if (visiting.has(d.id)) throw new Error(`decision dependency cycle at ${d.id}`);
    if (visited.has(d.id)) return;
    visiting.add(d.id);
    for (const id of d.depends) {
      const dependency = data.decisions.find((x) => x.id === id);
      if (!dependency) throw new Error(`${d.id}: missing dependency ${id}`);
      visit(dependency);
    }
    visiting.delete(d.id); visited.add(d.id);
  }
  data.decisions.forEach(visit);
  return data;
}

export function decisionFrontier(data, limit = 3) {
  const ready = data.decisions.filter((d) => d.state === 'open' && d.depends.every((id) => data.decisions.some((x) => x.id === id && x.state === 'settled')));
  return {
    questions: ready.filter((d) => d.owner === 'user').slice(0, limit),
    investigate: ready.filter((d) => d.owner !== 'user'),
    blocked: data.decisions.filter((d) => d.state === 'open' && !ready.includes(d)),
    assumptions: data.decisions.filter((d) => d.state === 'assumed'),
    complete: data.decisions.every((d) => ['settled', 'rejected'].includes(d.state)),
  };
}

export function updateDecisions(dir, mutate) {
  const file = path.join(dir, 'decisions.json');
  return withLock(file, () => {
    const data = readDecisions(dir);
    mutate(data);
    // Validate before writing by sharing the validator without a temporary file.
    validateDecisionData(data);
    writeJson(file, data);
    return data;
  });
}
