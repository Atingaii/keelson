import path from 'node:path';
import fs from 'node:fs';
import { exists, read, readOr, listDirs, walk } from './fs.js';
import { parseRulesIndex } from './rules.js';
import { parseSpec } from './markdown.js';
import { loadAllChanges } from './changes.js';
import { capabilityPhysicalDocs, readCapabilitySpec } from './specs.js';

const lines = (t) => String(t ?? '').split('\n').length;
export const HARD_BUDGET_MULTIPLIER = 2;

export function budgetStatus(text, budget, { hard = true } = {}) {
  const count = lines(text);
  const soft = Number(budget) || 0;
  const hardLimit = hard && soft ? soft * HARD_BUDGET_MULTIPLIER : null;
  if (!soft) return { state: 'unbounded', lines: count, budget: null, hardLimit: null };
  if (hardLimit && count > hardLimit) return { state: 'hard', lines: count, budget: soft, hardLimit };
  if (count > soft) return { state: 'compact', lines: count, budget: soft, hardLimit };
  return { state: 'ok', lines: count, budget: soft, hardLimit };
}
// Narrative markers: dated change sentences and "we later/then changed" phrasing. Words like "no longer" are legitimate present tense and are not flagged.
const HISTORY_NARRATIVE = /\b(used to be|was changed to|has been replaced by|we (then|later|subsequently) (moved|switched|changed|replaced)|as of (20\d\d|[A-Z][a-z]+ 20\d\d))\b|\b(20\d\d)[-/](0?[1-9]|1[0-2])\b[^\n]*\b(changed|moved|switched|replaced)\b/i;
const ORDINAL_UPDATE = /^#{2,4}\s+(update|changelog|history|migration notes)\b/im;

/**
 * Knowledge-health findings for a project. Pure over the file system; never edits.
 * Each finding: { level: 'error'|'warn'|'info', kind, text, fix }.
 * Durable truth has a hard ceiling at 2x its soft budget; temporary change/handoff
 * artifacts only receive compaction warnings because they disappear after landing.
 */
export function knowledgeHealth(root, cfg, p) {
  const out = [];
  const b = cfg.budgets ?? {};
  const over = (label, file, budget, { kind = 'budget', hard = true } = {}) => {
    if (!exists(file) || !budget) return;
    const pressure = budgetStatus(read(file), budget, { hard });
    if (pressure.state === 'hard') {
      out.push({ level: 'error', kind: 'budget-hard', text: `${label} is ${pressure.lines} lines (hard limit ${pressure.hardLimit}, budget ${pressure.budget})`, fix: 'compact before adding more durable truth: rewrite current state, split by capability/scope, delete history kept by git, and automate checkable rules' });
    } else if (pressure.state === 'compact') {
      out.push({ level: 'warn', kind, text: `${label} is ${pressure.lines} lines (budget ${pressure.budget})`, fix: 'compact: rewrite the current truth, split by capability or scope, delete history that git already keeps, move automatable rules into checks' });
    }
  };
  over('INTENT.md', p.intent, b.INTENT);
  over('ROADMAP.md', p.roadmap, b.ROADMAP);
  over('NOW.md', p.now, b.NOW);
  over('GLOSSARY.md', p.glossary, b.GLOSSARY);

  // always-on rules budget
  const idx = parseRulesIndex(readOr(p.rulesIndex));
  let alwaysOn = 0;
  for (const e of idx) if (e.glob === '**' || e.glob === '*') alwaysOn += lines(readOr(path.join(p.rules, e.file)));
  if (b['always-on']) {
    const pressure = budgetStatus('\n'.repeat(Math.max(0, alwaysOn - 1)), b['always-on']);
    if (pressure.state === 'hard') out.push({ level: 'error', kind: 'budget-hard', text: `always-on rules total ${alwaysOn} lines (hard limit ${pressure.hardLimit}, budget ${pressure.budget}); every session pays for them`, fix: 'scope rules to paths, split broad rules, or move checkable invariants into `check:` before adding more always-on prose' });
    else if (pressure.state === 'compact') out.push({ level: 'warn', kind: 'budget', text: `always-on rules total ${alwaysOn} lines (budget ${pressure.budget}); every session pays for them`, fix: 'scope rules to paths, or move checkable rules into `check:`' });
  }
  for (const e of idx) over(`rules/${e.file}`, path.join(p.rules, e.file), b.rule);

  // specs: budget, history narrative, duplicates across capabilities
  const reqIndex = new Map();
  for (const cap of listDirs(p.specs)) {
    const f = path.join(p.specs, cap, 'spec.md');
    if (!exists(f)) continue;
    for (const doc of capabilityPhysicalDocs(p.specs, cap)) {
      over(`${p.specsRel}/${cap}/${doc.rel}`, doc.file, b.spec);
    }
    const txt = readCapabilitySpec(p.specs, cap);
    const parsed = parseSpec(txt);
    const bodies = parsed.requirements.map((r) => r.body).join('\n');
    if (HISTORY_NARRATIVE.test(bodies) || ORDINAL_UPDATE.test(txt)) out.push({ level: 'warn', kind: 'narrative', text: `${p.specsRel}/${cap} reads like history in places`, fix: 'current truth is present tense; reasons go to Decisions, the sequence of changes stays in git' });
    for (const r of parsed.requirements) {
      const key = r.name.toLowerCase();
      if (reqIndex.has(key)) out.push({ level: 'warn', kind: 'duplicate', text: `requirement "${r.name}" appears in both ${reqIndex.get(key)} and ${cap}`, fix: 'one capability owns a requirement; the other links to it' });
      else reqIndex.set(key, cap);
    }
  }

  // changes: budget, idle, oversized
  const now = Date.now();
  for (const c of loadAllChanges(p.changes)) {
    over(`changes/${c.name}/change.md`, path.join(c.dir, 'change.md'), b.change, { hard: false });
    if (exists(path.join(c.dir, 'handoff.md'))) over(`changes/${c.name}/handoff.md`, path.join(c.dir, 'handoff.md'), b.handoff, { hard: false });
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
