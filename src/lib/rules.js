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

export function matchRules(rulesDir, paths) {
  const index = parseRulesIndex(readOr(path.join(rulesDir, 'index.md')));
  const hits = new Map();
  for (const e of index) {
    const always = e.glob === '**' || e.glob === '*';
    const matched = always || paths.some((p) => globMatch(e.glob, p));
    if (!matched) continue;
    const f = path.join(rulesDir, e.file);
    if (!hits.has(e.file)) hits.set(e.file, { file: e.file, globs: [], exists: exists(f), content: readOr(f) });
    hits.get(e.file).globs.push(e.glob);
  }
  return [...hits.values()];
}
