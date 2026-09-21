import { parseSpec, parseDelta, parseFrontmatter, renderSpec } from './markdown.js';

export function mergeDelta(mainText, deltaText, capability) {
  const main = mainText ? parseSpec(mainText) : { purpose: '', requirements: [], decisions: [] };
  const d = parseDelta(parseFrontmatter(deltaText).body);
  if (d.issues?.length) throw new Error(`malformed delta: ${d.issues.join('; ')}`);
  const key = (name) => name.normalize('NFC').toLowerCase();
  const names = [...d.added, ...d.modified, ...d.removed].map((r) => key(r.name));
  if (new Set(main.requirements.map((r) => key(r.name))).size !== main.requirements.length) throw new Error('ambiguous current spec: duplicate requirement names');
  if (new Set(names).size !== names.length) throw new Error('malformed delta: duplicate requirement');
  if ([...d.added, ...d.modified].some((r) => !r.body.trim())) throw new Error('malformed delta: empty requirement body');
  const reqs = [...main.requirements];
  const report = { added: [], modified: [], removed: [], missing: [] };
  for (const r of d.removed) {
    const i = reqs.findIndex((x) => key(x.name) === key(r.name));
    if (i === -1) throw new Error(`REMOVED "${r.name}" not found; use an existing requirement name`);
    else {
      reqs.splice(i, 1);
      report.removed.push(r.name);
    }
  }
  for (const r of d.modified) {
    const i = reqs.findIndex((x) => key(x.name) === key(r.name));
    if (i === -1) {
      throw new Error(`MODIFIED "${r.name}" not found; preserve its existing name or use ADDED for new behavior`);
    } else {
      reqs[i] = r;
      report.modified.push(r.name);
    }
  }
  for (const r of d.added) {
    const i = reqs.findIndex((x) => key(x.name) === key(r.name));
    if (i === -1) {
      reqs.push(r);
      report.added.push(r.name);
    } else {
      throw new Error(`ADDED "${r.name}" already exists; use MODIFIED to replace its current contract`);
    }
  }
  return { text: renderSpec({ ...main, name: main.name || capability, requirements: reqs }), report };
}


export function appendDecisions(specText, capability, lines) {
  const s = specText ? parseSpec(specText) : { purpose: '', requirements: [], decisions: [] };
  const existing = new Set(s.decisions.map((d) => d.toLowerCase()));
  const fresh = lines.filter((l) => !existing.has(`${capability}: ${l}`.toLowerCase()) && !existing.has(l.toLowerCase()));
  return renderSpec({ ...s, name: s.name || capability, decisions: [...s.decisions, ...fresh.map((l) => `${capability}: ${l}`)] });
}
