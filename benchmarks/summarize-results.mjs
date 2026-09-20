#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function cells(root) {
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    if (!entry.isDirectory()) return [];
    if (fs.existsSync(path.join(child, 'summary.json'))) return [child];
    return walk(child);
  });
  return walk(root);
}

function numberValues(rows, getter) {
  return rows.map(getter).filter((value) => Number.isFinite(value));
}

function numericSummary(rows, getter) {
  const values = numberValues(rows, getter);
  return { observed_cells: values.length, median: median(values), values };
}

const [output, ...roots] = process.argv.slice(2);
if (!output || !roots.length) {
  throw new Error('usage: summarize-results.mjs OUTPUT.json RESULT_ROOT [RESULT_ROOT ...]');
}

const rows = roots.flatMap((root) => cells(path.resolve(root)).map((directory) => {
  const summary = JSON.parse(fs.readFileSync(path.join(directory, 'summary.json'), 'utf8'));
  const footprintFile = path.join(directory, 'setup-footprint.json');
  const footprint = fs.existsSync(footprintFile)
    ? JSON.parse(fs.readFileSync(footprintFile, 'utf8')) : null;
  return { directory: path.relative(process.cwd(), directory), summary, footprint };
}));

const cellKeys = new Set();
for (const row of rows) {
  const key = [row.summary.task, row.summary.method, row.summary.repetition].join('::');
  if (cellKeys.has(key)) throw new Error(`duplicate benchmark cell in input roots: ${key}`);
  cellKeys.add(key);
}

const methods = Object.fromEntries([...new Set(rows.map((row) => row.summary.method))].sort().map((method) => {
  const methodRows = rows.filter((row) => row.summary.method === method);
  const metric = (getter) => numericSummary(methodRows, getter);
  return [method, {
    cells: methodRows.length,
    comparison_eligible_cells: methodRows.filter((row) => row.summary.comparison_eligible === true).length,
    mechanical_pass_cells: methodRows.filter((row) => row.summary.pass === true).length,
    codex_elapsed_ms: metric((row) => row.summary.codex_elapsed_ms),
    input_tokens: metric((row) => row.summary.tokens?.input_tokens),
    cached_input_tokens: metric((row) => row.summary.tokens?.cached_input_tokens),
    output_tokens: metric((row) => row.summary.tokens?.output_tokens),
    reasoning_output_tokens: metric((row) => row.summary.tokens?.reasoning_output_tokens),
    setup_footprint: {
      observed_cells: methodRows.filter((row) => row.footprint !== null).length,
      file_count: metric((row) => row.footprint?.file_count),
      lines: metric((row) => row.footprint?.lines),
      bytes: metric((row) => row.footprint?.bytes),
      top_level_paths_observed: [...new Set(methodRows.flatMap((row) => row.footprint?.top_level_paths ?? []))].sort(),
    },
  }];
}));

const result = {
  generated_by: 'benchmarks/summarize-results.mjs',
  roots: roots.map((root) => path.relative(process.cwd(), path.resolve(root))),
  limitation: 'Only finite values enter each median. Missing token or footprint values remain absent from that metric and are never replaced with zero. Setup footprint describes files provisioned by each treatment in the benchmark worktree; Python evaluation dependencies and transient runner artifacts are excluded by the runner.',
  cells: rows.map((row) => ({
    directory: row.directory,
    task: row.summary.task,
    method: row.summary.method,
    repetition: row.summary.repetition,
    comparison_eligible: row.summary.comparison_eligible ?? null,
    mechanical_pass: row.summary.pass ?? null,
    codex_elapsed_ms: Number.isFinite(row.summary.codex_elapsed_ms) ? row.summary.codex_elapsed_ms : null,
    tokens: row.summary.tokens ?? null,
    setup_footprint: row.footprint,
  })),
  methods,
};
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(path.resolve(output), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${path.resolve(output)}: summarized ${rows.length} cells\n`);
