import path from 'node:path';
import { exists, read, readOr, write, walk, rmrf } from './fs.js';
import { parseFrontmatter, parseSpec, renderSpec } from './markdown.js';

const lineCount = (text) => String(text ?? '').split('\n').length;
const slugify = (s) => String(s)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'requirement';

export function capabilityDir(specsDir, capability) {
  return path.join(specsDir, capability);
}

export function readCapabilitySpec(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  const mainPath = path.join(dir, 'spec.md');
  const main = readOr(mainPath, '');
  if (!main) return '';

  const { data } = parseFrontmatter(main);
  if (data.layout !== 'sharded') return main;

  const index = parseSpec(main);
  const requirements = [];
  const reqDir = path.join(dir, 'requirements');
  for (const rel of walk(reqDir)) {
    if (!rel.endsWith('.md')) continue;
    requirements.push(...parseSpec(read(path.join(reqDir, rel))).requirements);
  }
  const decisionsPath = path.join(dir, 'decisions.md');
  const decisions = exists(decisionsPath) ? parseSpec(read(decisionsPath)).decisions : [];
  return renderSpec({
    name: capability,
    purpose: index.purpose,
    requirements,
    decisions,
  });
}

function uniqueRequirementFiles(requirements) {
  const used = new Set();
  return requirements.map((r, i) => {
    let base = slugify(r.name);
    if (used.has(base)) base = `${base}-${i + 1}`;
    used.add(base);
    return {
      rel: `requirements/${base}.md`,
      name: r.name,
      text: `# ${r.name}\n\n## Requirement: ${r.name}\n\n${r.body.trim()}\n`,
    };
  });
}

function renderIndex(capability, spec, reqFiles, hasDecisions) {
  const parts = [
    '---',
    'layout: sharded',
    '---',
    `# ${capability}`,
    '',
  ];
  if (spec.purpose) parts.push('## Purpose', '', spec.purpose.trim(), '');
  parts.push('## Files', '');
  for (const r of reqFiles) parts.push(`- \`${r.rel}\` — Requirement: ${r.name}`);
  if (hasDecisions) parts.push('- `decisions.md` — durable decisions');
  parts.push('', 'This index is maintained by Keelson. Read only the requirement files relevant to the current change.', '');
  return parts.join('\n');
}

/**
 * Choose a bounded physical representation for one logical capability contract.
 * Total capability knowledge may grow; individual frequently-read files stay bounded.
 */
export function planCapabilityStorage(capability, logicalText, budget = 0) {
  const spec = parseSpec(logicalText);
  const canonical = renderSpec({
    name: capability,
    purpose: spec.purpose,
    requirements: spec.requirements,
    decisions: spec.decisions,
  });
  const soft = Number(budget) || 0;
  if (!soft || lineCount(canonical) <= soft) {
    return {
      mode: 'single',
      logicalText: canonical,
      files: [{ rel: 'spec.md', text: canonical }],
      hardOver: [],
    };
  }

  const reqFiles = uniqueRequirementFiles(spec.requirements);
  const decisionsText = spec.decisions.length
    ? `# Decisions — ${capability}\n\n## Decisions\n\n${spec.decisions.map((d) => `- ${d}`).join('\n')}\n`
    : null;
  const indexText = renderIndex(capability, spec, reqFiles, Boolean(decisionsText));
  const files = [
    { rel: 'spec.md', text: indexText },
    ...reqFiles.map(({ rel, text }) => ({ rel, text })),
    ...(decisionsText ? [{ rel: 'decisions.md', text: decisionsText }] : []),
  ];
  const hardLimit = soft * 2;
  const hardOver = files
    .map((f) => ({ rel: f.rel, lines: lineCount(f.text) }))
    .filter((f) => f.lines > hardLimit);

  return {
    mode: 'sharded',
    logicalText: canonical,
    files,
    hardLimit,
    hardOver,
  };
}

export function writeCapabilityStorage(specsDir, capability, plan) {
  const dir = capabilityDir(specsDir, capability);
  // requirements/ and decisions.md are Keelson-managed shards only when spec.md
  // carries layout: sharded. Rebuilding them atomically from logical truth avoids
  // stale fragments surviving a compaction.
  rmrf(path.join(dir, 'requirements'));
  rmrf(path.join(dir, 'decisions.md'));
  for (const file of plan.files) write(path.join(dir, file.rel), file.text);
}

export function capabilityPhysicalDocs(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  const out = [];
  for (const rel of ['spec.md', 'decisions.md']) {
    const file = path.join(dir, rel);
    if (exists(file)) out.push({ rel, file });
  }
  const reqDir = path.join(dir, 'requirements');
  for (const rel of walk(reqDir)) {
    if (rel.endsWith('.md')) out.push({ rel: `requirements/${rel}`, file: path.join(reqDir, rel) });
  }
  return out;
}
