import path from 'node:path';
import { readOr, exists } from './fs.js';
import { globMatch } from './glob.js';

/** rules/index.md lines: "- `src/api/**` → api.md" (also accepts "->" and ":") */
export function parseRulesIndex(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-*]\s+`([^`]+)`\s*(?:→|->|:)\s*`?([^`\s]+)`?\s*(?:[—-]\s*(.*))?$/);
    if (m) entries.push({ glob: m[1].trim(), file: m[2].trim(), note: (m[3] ?? '').trim() });
  }
  return entries;
}

// Declared touches can themselves be globs. Keep every rule whose literal
// prefix can overlap; extra context is preferable to silently missing a rule.
function mayOverlap(a, b) {
  const prefix = (s) => s.replace(/^\.\//, '').split(/[*?{]/, 1)[0].replace(/\/$/, '');
  const x = prefix(a), y = prefix(b);
  return x.startsWith(y) || y.startsWith(x);
}

export function matchRules(rulesDir, paths, { patterns = false } = {}) {
  const index = parseRulesIndex(readOr(path.join(rulesDir, 'index.md')));
  const hits = new Map();
  for (const e of index) {
    const always = e.glob === '**' || e.glob === '*';
    const matched = always || paths.some((p) => globMatch(e.glob, p) || (patterns && /[*?{]/.test(p) && mayOverlap(e.glob, p)));
    if (!matched) continue;
    const f = path.join(rulesDir, e.file);
    if (!hits.has(e.file)) hits.set(e.file, { file: e.file, globs: [], exists: exists(f), content: readOr(f) });
    hits.get(e.file).globs.push(e.glob);
  }
  return [...hits.values()];
}
