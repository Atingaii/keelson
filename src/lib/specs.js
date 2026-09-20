import path from 'node:path';
import crypto from 'node:crypto';
import { exists, read, readOr, write, walk, rmrf } from './fs.js';
import { parseFrontmatter, parseSpec, renderSpec } from './markdown.js';

const lineCount = (text) => String(text ?? '').split('\n').length;
const slugify = (s) => String(s)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60) || 'requirement';

export const specFingerprint = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

export function capabilityDir(specsDir, capability) {
  return path.join(specsDir, capability);
}

const firstFree = (dir, preferred, fallback) => {
  if (!exists(path.join(dir, preferred))) return preferred;
  if (!exists(path.join(dir, fallback))) return fallback;
  for (let i = 2; ; i++) {
    const dot = fallback.lastIndexOf('.');
    const candidate = dot > 0
      ? `${fallback.slice(0, dot)}-${i}${fallback.slice(dot)}`
      : `${fallback}-${i}`;
    if (!exists(path.join(dir, candidate))) return candidate;
  }
};

export function capabilityStorageOptions(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  const main = readOr(path.join(dir, 'spec.md'), '');
  const { data } = parseFrontmatter(main);
  if (data.layout === 'sharded') {
    return {
      requirementsDir: data.requirements_dir || 'requirements',
      decisionsDir: data.decisions_dir || null,
      decisionsFile: data.decisions_file || null,
    };
  }
  return {
    requirementsDir: firstFree(dir, 'requirements', 'keelson-requirements'),
    decisionsDir: firstFree(dir, 'decisions', 'keelson-decisions'),
    decisionsFile: null,
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
  const decisions = [];
  if (data.decisions_dir) {
    const decisionsDir = path.join(dir, data.decisions_dir);
    for (const rel of walk(decisionsDir)) {
      if (!rel.endsWith('.md')) continue;
      decisions.push(...parseSpec(read(path.join(decisionsDir, rel))).decisions);
    }
  } else {
    const decisionsPath = path.join(dir, data.decisions_file || 'decisions.md');
    if (exists(decisionsPath)) decisions.push(...parseSpec(read(decisionsPath)).decisions);
  }
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

function uniqueDecisionFiles(decisions, decisionsDir) {
  return decisions.map((decision, i) => {
    const digest = crypto.createHash('sha1').update(decision).digest('hex').slice(0, 8);
    const words = decision
      .replace(/^[^:]+:\s*/, '')
      .split(/\s+/)
      .slice(0, 6)
      .join('-');
    const stem = slugify(words) || 'decision';
    return {
      rel: `${decisionsDir}/${String(i + 1).padStart(3, '0')}-${stem}-${digest}.md`,
      text: `# Decision\n\n## Decisions\n\n- ${decision}\n`,
    };
  });
}

function renderIndex(capability, spec, reqFiles, { requirementsDir, decisionsDir, decisionsFile, decisionCount }) {
  const parts = [
    '---',
    'layout: sharded',
    `requirements_dir: ${requirementsDir}`,
    ...(decisionsDir ? [`decisions_dir: ${decisionsDir}`] : decisionsFile ? [`decisions_file: ${decisionsFile}`] : []),
    '---',
    `# ${capability}`,
    '',
  ];
  if (spec.purpose) parts.push('## Purpose', '', spec.purpose.trim(), '');
  parts.push(`- \`${requirementsDir}/\` — ${reqFiles.length} current requirement file(s); read only relevant files`);
  if (decisionCount) {
    const location = decisionsDir ? `${decisionsDir}/` : decisionsFile;
    parts.push(`- \`${location}\` — ${decisionCount} capability-local durable decision file(s)`);
  }
  parts.push('');
  return parts.join('\n');
}

/**
 * Choose a bounded physical representation for one logical capability contract.
 * Total capability knowledge may grow; individual frequently-read files stay bounded.
 */
export function planCapabilityStorage(capability, logicalText, budget = 0, {
  requirementsDir = 'requirements',
  decisionsDir = 'decisions',
  decisionsFile = null,
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
  const decisionFiles = spec.decisions.length
    ? uniqueDecisionFiles(spec.decisions, decisionsDir)
    : [];
  const indexText = renderIndex(capability, spec, reqFiles, {
    requirementsDir,
    decisionsDir,
    decisionsDir,
    decisionsFile,
    decisionCount: decisionFiles.length,
  });
  const files = [
    { rel: 'spec.md', text: indexText },
    ...reqFiles.map(({ rel, text }) => ({ rel, text })),
    ...decisionFiles,
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
    if (data.decisions_dir) rmrf(path.join(dir, data.decisions_dir));
    if (data.decisions_file) rmrf(path.join(dir, data.decisions_file));
  }
  if (plan.mode === 'sharded') {
    rmrf(path.join(dir, plan.requirementsDir));
    if (plan.decisionsDir) rmrf(path.join(dir, plan.decisionsDir));
    if (plan.decisionsFile) rmrf(path.join(dir, plan.decisionsFile));
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
  if (data.decisions_dir) {
    const decisionsDir = path.join(dir, data.decisions_dir);
    for (const rel of walk(decisionsDir)) {
      if (rel.endsWith('.md')) out.push({ rel: `${data.decisions_dir}/${rel}`, file: path.join(decisionsDir, rel) });
    }
  } else {
    const decisionsRel = data.decisions_file || 'decisions.md';
    const decisions = path.join(dir, decisionsRel);
    if (exists(decisions)) out.push({ rel: decisionsRel, file: decisions });
  }
  const requirementsRel = data.requirements_dir || 'requirements';
  const reqDir = path.join(dir, requirementsRel);
  for (const rel of walk(reqDir)) {
    if (rel.endsWith('.md')) out.push({ rel: `${requirementsRel}/${rel}`, file: path.join(reqDir, rel) });
  }
  return out;
}

export function changeSpecDrift(change, specsDir) {
  const out = [];
  for (const df of change.deltaFiles ?? []) {
    const cap = path.dirname(df).replace(/\\/g, '/');
    if (cap === '.' || cap.includes('<')) continue;
    const deltaPath = path.join(change.dir, 'specs', df);
    const { data } = parseFrontmatter(read(deltaPath));
    if (!data.base) continue;
    const logical = readCapabilitySpec(specsDir, cap);
    const current = logical ? specFingerprint(logical) : 'new';
    if (current !== data.base) {
      out.push({
        capability: cap,
        expected: data.base,
        current,
        detail: `specs/${cap} changed since this delta was written (base ${data.base}, now ${current}); re-read and reconcile the delta`,
      });
    }
  }
  return out;
}
