import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { exists, read, readOr, write, walk, rmrf } from './fs.js';
import { markdownHeadings, parseFrontmatter, parseSpec, renderSpec } from './markdown.js';
import { resolveWithin } from './paths.js';

const lineCount = (text) => String(text ?? '').split('\n').length;

const hasText = (lines) => lines.some((line) => line.trim());
const requirementTitle = (title) => /^Requirement:\s*(.+)$/i.test(title);

/**
 * Sharded storage can represent the title, purpose, requirements, and decision
 * bullets.  Do not use a byte-for-byte comparison with canonical output here:
 * ordinary specs have harmless choices in blank lines and heading order.  We
 * instead reject only source material for which the shard index has no owner.
 */
function hasUnmanagedSpecContent(capability, spec) {
  const source = spec.source;
  const { body } = parseFrontmatter(source);
  // The shard index owns its own layout frontmatter. Any source frontmatter,
  // including an otherwise empty block, would be discarded by that index.
  if (body !== source || spec.name !== capability) return true;

  const lines = body.split('\n');
  const headings = markdownHeadings(body);
  const names = headings.filter((heading) => heading.level === 1);
  if (names.length !== 1 || hasText(lines.slice(0, names[0].line))) return true;

  const h2 = headings.filter((heading) => heading.level === 2);
  let cursor = names[0].line + 1;
  let purposeCount = 0;
  for (const heading of h2) {
    // Text between structural sections is not parsed into any owned field.
    if (hasText(lines.slice(cursor, heading.line))) return true;
    const next = headings.find((candidate) => candidate.line > heading.line && candidate.level <= 2);
    const end = next ? next.line : lines.length;
    const content = lines.slice(heading.line + 1, end);

    if (/^Purpose$/i.test(heading.title)) {
      if (++purposeCount > 1) return true;
    } else if (requirementTitle(heading.title)) {
      // A legacy requirement's complete body is written into its own shard.
    } else if (/^Requirements$/i.test(heading.title)) {
      const h3 = headings.filter((candidate) => candidate.level === 3
        && candidate.line > heading.line && candidate.line < end);
      if (h3.some((candidate) => !requirementTitle(candidate.title))) return true;
      // Preamble prose under an nested container is not part of any
      // requirement and would disappear when the container becomes a folder.
      if (h3.length && hasText(lines.slice(heading.line + 1, h3[0].line))) return true;
      if (!h3.length && hasText(content)) return true;
    } else if (/^Decisions?$/i.test(heading.title)) {
      // parseSpec owns decision bullets only. Keep comments, prose, headings,
      // and fenced examples in the original document rather than silently
      // converting or dropping them.
      if (content.some((line) => line.trim() && !/^\s*[-*]\s+/.test(line))) return true;
    } else {
      return true;
    }
    cursor = end;
  }
  return hasText(lines.slice(cursor));
}
export const slugify = (s) => Array.from(String(s)
  .normalize('NFKD')
  .replace(/\p{Mark}/gu, '')
  .toLocaleLowerCase()
  .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
  .replace(/^-+|-+$/g, ''))
  .slice(0, 60)
  .join('') || 'requirement';

export const specFingerprint = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

export function capabilityDir(specsDir, capability) {
  return resolveWithin(specsDir, capability);
}

function capabilityStorageRoot(specsDir, capability) {
  const dir = capabilityDir(specsDir, capability);
  if (exists(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error(`capability storage root must not be a symlink: ${dir}`);
  return dir;
}

/** Keep sharding metadata from escaping its capability directory. */
function storagePath(dir, rel) {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel)) throw new Error('capability storage path must be relative');
  if (exists(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error(`capability storage root must not be a symlink: ${dir}`);
  const absolute = path.resolve(dir, rel);
  const relative = path.relative(dir, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`capability storage path escapes its root: ${rel}`);
  let current = dir;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    if (exists(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`capability storage path must not be a symlink: ${current}`);
  }
  return absolute;
}

const safeStorageRel = (dir, rel) => {
  storagePath(dir, rel);
  return rel;
};

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
  const dir = capabilityStorageRoot(specsDir, capability);
  const main = readOr(storagePath(dir, 'spec.md'), '');
  const { data } = parseFrontmatter(main);
  if (data.layout === 'sharded') {
    return {
      requirementsDir: safeStorageRel(dir, data.requirements_dir || 'requirements'),
      // Older Keelson layouts used one decisions_file. New writes migrate that
      // representation to a directory without touching an unmanaged decisions/
      // neighbor that the project may already own.
      decisionsDir: data.decisions_dir
        ? safeStorageRel(dir, data.decisions_dir)
        : firstFree(dir, 'decisions', 'keelson-decisions'),
      decisionsFile: null,
    };
  }
  return {
    requirementsDir: firstFree(dir, 'requirements', 'keelson-requirements'),
    decisionsDir: firstFree(dir, 'decisions', 'keelson-decisions'),
    decisionsFile: null,
  };
}

export function readCapabilitySpec(specsDir, capability) {
  const dir = capabilityStorageRoot(specsDir, capability);
  const mainPath = storagePath(dir, 'spec.md');
  const main = readOr(mainPath, '');
  if (!main) return '';

  const { data } = parseFrontmatter(main);
  if (data.layout !== 'sharded') return main;

  const index = parseSpec(main);
  const requirements = [];
  const reqDir = storagePath(dir, data.requirements_dir || 'requirements');
  for (const rel of walk(reqDir)) {
    if (!rel.endsWith('.md')) continue;
    requirements.push(...parseSpec(read(storagePath(reqDir, rel))).requirements);
  }
  const decisions = [];
  if (data.decisions_dir) {
    const decisionsDir = storagePath(dir, data.decisions_dir);
    for (const rel of walk(decisionsDir)) {
      if (!rel.endsWith('.md')) continue;
      decisions.push(...parseSpec(read(storagePath(decisionsDir, rel))).decisions);
    }
  } else {
    const decisionsPath = storagePath(dir, data.decisions_file || 'decisions.md');
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
  const canonical = renderSpec(spec);
  const soft = Number(budget) || 0;
  // A shard index has room only for the parsed ownership model. Keep a single
  // file when source content has no shard owner, but accept harmless canonical
  // layout differences in otherwise fully-modelled legacy/nested documents.
  const mustKeepSingle = hasUnmanagedSpecContent(capability, spec);
  if (!soft || lineCount(canonical) <= soft || mustKeepSingle) {
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
    decisionsDir,
    decisionsFile,
  };
}

export function writeCapabilityStorage(specsDir, capability, plan) {
  const dir = capabilityStorageRoot(specsDir, capability);
  const currentMain = readOr(storagePath(dir, 'spec.md'), '');
  const { data } = parseFrontmatter(currentMain);
  if (data.layout === 'sharded') {
    rmrf(storagePath(dir, data.requirements_dir || 'requirements'));
    if (data.decisions_dir) rmrf(storagePath(dir, data.decisions_dir));
    if (data.decisions_file) rmrf(storagePath(dir, data.decisions_file));
  }
  if (plan.mode === 'sharded') {
    rmrf(storagePath(dir, plan.requirementsDir));
    if (plan.decisionsDir) rmrf(storagePath(dir, plan.decisionsDir));
    if (plan.decisionsFile) rmrf(storagePath(dir, plan.decisionsFile));
  }
  for (const file of plan.files) write(storagePath(dir, file.rel), file.text);
}

export function capabilityPhysicalDocs(specsDir, capability) {
  const dir = capabilityStorageRoot(specsDir, capability);
  const out = [];
  const main = readOr(storagePath(dir, 'spec.md'), '');
  if (main) out.push({ rel: 'spec.md', file: storagePath(dir, 'spec.md') });
  const { data } = parseFrontmatter(main);
  if (data.layout !== 'sharded') return out;
  if (data.decisions_dir) {
    const decisionsDir = storagePath(dir, data.decisions_dir);
    for (const rel of walk(decisionsDir)) {
      if (rel.endsWith('.md')) out.push({ rel: `${data.decisions_dir}/${rel}`, file: storagePath(decisionsDir, rel) });
    }
  } else {
    const decisionsRel = data.decisions_file || 'decisions.md';
    const decisions = storagePath(dir, decisionsRel);
    if (exists(decisions)) out.push({ rel: decisionsRel, file: decisions });
  }
  const requirementsRel = data.requirements_dir || 'requirements';
  const reqDir = storagePath(dir, requirementsRel);
  for (const rel of walk(reqDir)) {
    if (rel.endsWith('.md')) out.push({ rel: `${requirementsRel}/${rel}`, file: storagePath(reqDir, rel) });
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
