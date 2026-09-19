import path from 'node:path';
import fs from 'node:fs';
import { exists, read, readOr, listDirs, walk } from './fs.js';
import { parseRulesIndex } from './rules.js';
import { parseSpec } from './markdown.js';
import { loadAllChanges } from './changes.js';

const lines = (t) => t.split('\n').length;
// Narrative markers: dated change sentences and "we later/then changed" phrasing. Words like "no longer" are legitimate present tense and are not flagged.
const HISTORY_NARRATIVE = /\b(used to be|was changed to|has been replaced by|we (then|later|subsequently) (moved|switched|changed|replaced)|as of (20\d\d|[A-Z][a-z]+ 20\d\d))\b|\b(20\d\d)[-/](0?[1-9]|1[0-2])\b[^\n]*\b(changed|moved|switched|replaced)\b/i;
const ORDINAL_UPDATE = /^#{2,4}\s+(update|changelog|history|migration notes)\b/im;

/**
 * Knowledge-health findings for a project. Pure over the file system; never edits.
 * Each finding: { level: 'warn'|'info', kind, text, fix }.
 */
export function knowledgeHealth(root, cfg, p) {
  const out = [];
  const b = cfg.budgets ?? {};
  const over = (label, file, budget, kind = 'budget') => {
    if (!exists(file) || !budget) return;
    const n = lines(read(file));
    if (n > budget) out.push({ level: 'warn', kind, text: `${label} is ${n} lines (budget ${budget})`, fix: 'compact: rewrite the current truth, split by capability or scope, delete history that git already keeps, move automatable rules into checks' });
  };
  over('INTENT.md', p.intent, b.INTENT);
  over('ROADMAP.md', p.roadmap, b.ROADMAP);
  over('NOW.md', p.now, b.NOW);
  over('GLOSSARY.md', p.glossary, b.GLOSSARY);

  // always-on rules budget
  const idx = parseRulesIndex(readOr(p.rulesIndex));
  let alwaysOn = 0;
  for (const e of idx) if (e.glob === '**' || e.glob === '*') alwaysOn += lines(readOr(path.join(p.rules, e.file)));
  if (b['always-on'] && alwaysOn > b['always-on']) out.push({ level: 'warn', kind: 'budget', text: `always-on rules total ${alwaysOn} lines (budget ${b['always-on']}); every session pays for them`, fix: 'scope rules to paths, or move checkable rules into `check:`' });
  for (const e of idx) over(`rules/${e.file}`, path.join(p.rules, e.file), b.rule);

  // specs: budget, history narrative, duplicates across capabilities
  const reqIndex = new Map();
  for (const cap of listDirs(p.specs)) {
    const f = path.join(p.specs, cap, 'spec.md');
    if (!exists(f)) continue;
    const txt = read(f);
    over(`${p.specsRel}/${cap}/spec.md`, f, b.spec);
    const bodies = parseSpec(txt).requirements.map((r) => r.body).join('\n');
    if (HISTORY_NARRATIVE.test(bodies) || ORDINAL_UPDATE.test(txt)) out.push({ level: 'warn', kind: 'narrative', text: `${p.specsRel}/${cap}/spec.md reads like history in places`, fix: 'current truth is present tense; reasons go to Decisions, the sequence of changes stays in git' });
    for (const r of parseSpec(txt).requirements) {
      const key = r.name.toLowerCase();
      if (reqIndex.has(key)) out.push({ level: 'warn', kind: 'duplicate', text: `requirement "${r.name}" appears in both ${reqIndex.get(key)} and ${cap}`, fix: 'one capability owns a requirement; the other links to it' });
      else reqIndex.set(key, cap);
    }
  }

  // changes: budget, idle, oversized
  const now = Date.now();
  for (const c of loadAllChanges(p.changes)) {
    over(`changes/${c.name}/change.md`, path.join(c.dir, 'change.md'), b.change);
    if (exists(path.join(c.dir, 'handoff.md'))) over(`changes/${c.name}/handoff.md`, path.join(c.dir, 'handoff.md'), b.handoff);
    if (c.tasks.length > 25) out.push({ level: 'warn', kind: 'oversized', text: `changes/${c.name} has ${c.tasks.length} tasks`, fix: 'split into changes that can be accepted on their own; `depends:` links them' });
    const stamp = fs.statSync(path.join(c.dir, 'change.md')).mtimeMs;
    const newest = Math.max(stamp, ...['tasks.md', 'ledger.md', 'handoff.md'].map((f) => (exists(path.join(c.dir, f)) ? fs.statSync(path.join(c.dir, f)).mtimeMs : 0)));
    const days = Math.floor((now - newest) / 86400000);
    if (days >= 14) out.push({ level: 'warn', kind: 'idle', text: `changes/${c.name} has not been touched for ${days} days (work: ${c.work})`, fix: 'finish it, `keelson handoff` it with a next step, or `keelson cancel` it with a reason' });
  }

  // generated docs older than the code they describe
  const gen = path.join(root, 'docs', 'generated');
  if (exists(gen)) {
    const srcNewest = newestMtime(path.join(root, 'src')) ?? newestMtime(root);
    for (const f of walk(gen)) {
      const m = fs.statSync(path.join(gen, f)).mtimeMs;
      if (srcNewest && m + 86400000 < srcNewest) out.push({ level: 'info', kind: 'stale-generated', text: `docs/generated/${f} is older than the source tree`, fix: 'regenerate it from the code, or delete it if nothing reads it' });
    }
  }

  // refs pointing at missing files are caught by validate; here: specs that name no scenario are caught by validate too.
  return out;
}

function newestMtime(dir) {
  if (!exists(dir)) return null;
  let m = 0;
  for (const f of walk(dir, { ignore: ['node_modules', '.git', '.keelson', 'dist', 'build', 'docs'] })) {
    try {
      m = Math.max(m, fs.statSync(path.join(dir, f)).mtimeMs);
    } catch {}
  }
  return m || null;
}
