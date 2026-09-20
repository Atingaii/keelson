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

export function capabilityStorageOptions(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  const main = readOr(path.join(dir, 'spec.md'), '');
  const { data } = parseFrontmatter(main);
  if (data.layout === 'sharded') {
    return {
      requirementsDir: data.requirements_dir || 'requirements',
      decisionsFile: data.decisions_file || 'decisions.md',
    };
  }
  return {
    requirementsDir: exists(path.join(dir, 'requirements')) ? 'keelson-requirements' : 'requirements',
    decisionsFile: exists(path.join(dir, 'decisions.md')) ? 'keelson-decisions.md' : 'decisions.md',
  };
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
  const reqDir = path.join(dir, data.requirements_dir || 'requirements');
  for (const rel of walk(reqDir)) {
    if (!rel.endsWith('.md')) continue;
    requirements.push(...parseSpec(read(path.join(reqDir, rel))).requirements);
  }
  const decisionsPath = path.join(dir, data.decisions_file || 'decisions.md');
  const decisions = exists(decisionsPath) ? parseSpec(read(decisionsPath)).decisions : [];
  return renderSpec({
    name: capability,
    purpose: index.purpose,
    requirements,
    decisions,
  });
}

function uniqueRequirementFiles(requirements, requirementsDir) {
  const used = new Set();
  return requirements.map((r, i) => {
    let base = slugify(r.name);
    if (used.has(base)) base = `${base}-${i + 1}`;
    used.add(base);
    return {
      rel: `${requirementsDir}/${base}.md`,
      name: r.name,
      text: `# ${r.name}\n\n## Requirement: ${r.name}\n\n${r.body.trim()}\n`,
    };
  });
}

function renderIndex(capability, spec, reqFiles, { requirementsDir, decisionsFile, hasDecisions }) {
  const parts = [
    '---',
    'layout: sharded',
    `requirements_dir: ${requirementsDir}`,
    `decisions_file: ${decisionsFile}`,
    '---',
    `# ${capability}`,
    '',
  ];
  if (spec.purpose) parts.push('## Purpose', '', spec.purpose.trim(), '');
  parts.push(`- \`${requirementsDir}/\` — ${reqFiles.length} current requirement file(s); read only relevant files`);
  if (hasDecisions) parts.push(`- \`${decisionsFile}\` — capability-local durable decisions`);
  parts.push('');
  return parts.join('\n');
}

/**
 * Choose a bounded physical representation for one logical capability contract.
 * Total capability knowledge may grow; individual frequently-read files stay bounded.
 */
export function planCapabilityStorage(capability, logicalText, budget = 0, {
  requirementsDir = 'requirements',
  decisionsFile = 'decisions.md',
} = {}) {
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

  const reqFiles = uniqueRequirementFiles(spec.requirements, requirementsDir);
  const decisionsText = spec.decisions.length
    ? `# Decisions — ${capability}\n\n## Decisions\n\n${spec.decisions.map((d) => `- ${d}`).join('\n')}\n`
    : null;
  const indexText = renderIndex(capability, spec, reqFiles, { requirementsDir, decisionsFile, hasDecisions: Boolean(decisionsText) });
  const files = [
    { rel: 'spec.md', text: indexText },
    ...reqFiles.map(({ rel, text }) => ({ rel, text })),
    ...(decisionsText ? [{ rel: decisionsFile, text: decisionsText }] : []),
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
    requirementsDir,
    decisionsFile,
  };
}

export function writeCapabilityStorage(specsDir, capability, plan) {
  const dir = capabilityDir(specsDir, capability);
  const currentMain = readOr(path.join(dir, 'spec.md'), '');
  const { data } = parseFrontmatter(currentMain);
  if (data.layout === 'sharded') {
    rmrf(path.join(dir, data.requirements_dir || 'requirements'));
    rmrf(path.join(dir, data.decisions_file || 'decisions.md'));
  }
  if (plan.mode === 'sharded') {
    rmrf(path.join(dir, plan.requirementsDir));
    rmrf(path.join(dir, plan.decisionsFile));
  }
  for (const file of plan.files) write(path.join(dir, file.rel), file.text);
}

export function capabilityPhysicalDocs(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  const out = [];
  const main = readOr(path.join(dir, 'spec.md'), '');
  if (main) out.push({ rel: 'spec.md', file: path.join(dir, 'spec.md') });
  const { data } = parseFrontmatter(main);
  if (data.layout !== 'sharded') return out;
  const decisionsRel = data.decisions_file || 'decisions.md';
  const decisions = path.join(dir, decisionsRel);
  if (exists(decisions)) out.push({ rel: decisionsRel, file: decisions });
  const requirementsRel = data.requirements_dir || 'requirements';
  const reqDir = path.join(dir, requirementsRel);
  for (const rel of walk(reqDir)) {
    if (rel.endsWith('.md')) out.push({ rel: `${requirementsRel}/${rel}`, file: path.join(reqDir, rel) });
  }
  return out;
}
