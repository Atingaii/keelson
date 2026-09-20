/** Small, dependency-free helpers for the Markdown shapes Keelson relies on. */

export const normalizeNewlines = (text) => String(text ?? '').replace(/\r\n?/g, '\n');

/**
 * Return ATX headings while deliberately ignoring fenced code blocks. Markdown
 * examples are common in specs, and treating their headings as document
 * structure corrupts everything that follows them.
 */
function headings(text) {
  const out = [];
  let fence = null;
  for (const [line, raw] of normalizeNewlines(text).split('\n').entries()) {
    const opening = raw.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.char}{${fence.size},}\\s*$`).test(raw)) fence = null;
      continue;
    }
    if (opening) {
      fence = { char: opening[1][0], size: opening[1].length };
      continue;
    }
    const m = raw.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?)\s*|[ \t]*)$/);
    if (!m || !m[2]) continue;
    out.push({ line, level: m[1].length, title: m[2].replace(/[ \t]+#+[ \t]*$/, '').trim() });
  }
  return out;
}

/**
 * Expose the fence-aware structural view for consumers which must decide
 * whether a Markdown document can be represented by a narrower data model.
 */
export const markdownHeadings = (text) => headings(text);

export function parseFrontmatter(text) {
  text = normalizeNewlines(text);
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (mm) data[mm[1]] = mm[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: text.slice(m[0].length) };
}

export function renderFrontmatter(data) {
  return `---\n${Object.entries(data)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n`;
}

/** Split into sections by heading level (default: h2). Returns [{title, level, body}]. */
export function sections(text, level = 2) {
  text = normalizeNewlines(text);
  const lines = text.split('\n');
  const out = [];
  let cur = null;
  const byLine = new Map(headings(text).map((h) => [h.line, h]));
  for (const [i, line] of lines.entries()) {
    const heading = byLine.get(i);
    if (heading?.level === level) {
      cur = { title: heading.title, level, body: '' };
      out.push(cur);
    } else if (heading && heading.level < level) {
      cur = null;
    } else if (cur) {
      cur.body += (cur.body ? '\n' : '') + line;
    }
  }
  return out;
}

export const hasSection = (text, title, level = 2) =>
  sections(text, level).some((s) => s.title.toLowerCase().startsWith(title.toLowerCase()));

/**
 * Tasks: "- [ ] 1.2 Do the thing (effort: light) — verify: `cmd`"
 * Optional slices group tasks: "## Slice: Create and access" followed by "Delivers: <observable result>".
 * Tasks before any slice heading belong to an implicit slice named after the change.
 */
export function parseTasks(text) {
  text = normalizeNewlines(text);
  const tasks = [];
  let slice = null;
  for (const line of text.split('\n')) {
    const sm = line.match(/^##\s+Slice:\s*(.+)$/i);
    if (sm) {
      slice = /^…|\{\{/.test(sm[1].trim()) ? null : sm[1].trim();
      continue;
    }
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (!m) continue;
    const done = m[1] !== ' ';
    let rest = m[2];
    const effort = (rest.match(/\(effort:\s*(light|standard|deep)\)/i) || [])[1]?.toLowerCase() ?? null;
    const verify = (rest.match(/verify:\s*`([^`]+)`/i) || [])[1] ?? null;
    const id = (rest.match(/^(\d+(?:\.\d+)*)[.)]?\s+/) || [])[1] ?? null;
    const cut = rest.search(/\s*(?:[—–-]\s*verify:|\(effort:)/i);
    const title = (cut === -1 ? rest : rest.slice(0, cut)).replace(/^(\d+(?:\.\d+)*)[.)]?\s+/, '').trim();
    tasks.push({ id, title, done, effort, verify, slice, raw: line });
  }
  return tasks;
}

/** Slices with their "Delivers:" line and task progress. */
export function parseSlices(text) {
  text = normalizeNewlines(text);
  const out = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const sm = line.match(/^##\s+Slice:\s*(.+)$/i);
    if (sm) {
      const name = sm[1].trim();
      cur = /^…|\{\{/.test(name) ? null : { name, delivers: null, done: 0, total: 0 };
      if (cur) out.push(cur);
      continue;
    }
    if (!cur) continue;
    const dm = line.match(/^\s*\**Delivers\**\s*[:：]\s*(.+)$/i);
    if (dm && !cur.delivers) cur.delivers = dm[1].trim();
    const tm = line.match(/^\s*[-*]\s+\[([ xX])\]\s+/);
    if (tm) {
      cur.total++;
      if (tm[1] !== ' ') cur.done++;
    }
  }
  return out;
}

/** Acceptance: "- [ ] criterion — check: `cmd` | test: name | manual: how" under "## Acceptance". */
export function parseAcceptance(body) {
  const sec = sections(body, 2).find((s) => /^Acceptance$/i.test(s.title));
  if (!sec) return [];
  const out = [];
  for (const line of sec.body.split('\n')) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (!m) continue;
    const rest = m[2];
    const cm = rest.match(/[—–-]\s*(check|test|manual|review)\s*:\s*(.+)$/i);
    const text = (cm ? rest.slice(0, cm.index) : rest).trim();
    if (!text || /^…|\{\{/.test(text)) continue;
    out.push({ done: m[1] !== ' ', text, kind: cm ? cm[1].toLowerCase() : null, how: cm ? cm[2].trim() : null });
  }
  return out;
}

/** Open questions: "- question — blocks: slice a, slice b" under "## Open questions". */
export function parseOpenQuestions(body) {
  const sec = sections(body, 2).find((s) => /^Open questions?$/i.test(s.title));
  if (!sec) return [];
  return sec.body
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter((l) => l && !/^(none|无|—|-)\.?$/i.test(l) && !/^…|\{\{/.test(l))
    .map((l) => {
      const bm = l.match(/[—–-]\s*blocks\s*:\s*(.+)$/i);
      return { text: bm ? l.slice(0, bm.index).trim() : l, blocks: bm ? bm[1].split(/[,，]/).map((x) => x.trim()).filter(Boolean) : [] };
    });
}

/**
 * Decisions: "- capability: text" with an optional leading state tag "(confirmed)" or "(assumed)".
 * Untagged lines count as confirmed; assumed lines are the agent's working assumptions awaiting the owner.
 */
export function parseDecisions(body) {
  const sec = sections(body, 2).find((s) => /^Decisions?$/i.test(s.title));
  if (!sec) return [];
  return sec.body
    .split('\n')
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter((l) => l && !/^…|\{\{/.test(l))
    .map((l) => {
      const tm = l.match(/^\((confirmed|assumed|authorized)\)\s*/i);
      const state = tm ? tm[1].toLowerCase() : 'confirmed';
      const rest = tm ? l.slice(tm[0].length) : l;
      const m = rest.match(/^([a-z0-9][a-z0-9/-]*)\s*:\s*(.+)$/i);
      return m ? { state, capability: m[1].toLowerCase(), text: m[2].trim() } : { state, capability: null, text: rest };
    })
    .filter((d) => d.text && !/^…|\{\{|^<[a-z]/.test(d.text));
}

export const WORK_STATUSES = ['clarifying', 'in-progress', 'blocked', 'ready', 'in-review', 'integrated', 'cancelled'];

export const EFFORT_TIERS = ['light', 'standard', 'deep'];
export const effortRank = (t) => EFFORT_TIERS.indexOf(t);

/** Ledger entries are h3 headings: "### Ruling: …", "### Root cause: implicit-assumption", "### Verify: …", "### Dispatch: …", "### Escalate: …" */
export function parseLedger(text) {
  const out = [];
  for (const s of sections(text, 3)) {
    const m = s.title.match(/^(Ruling|Root cause|Verify|Dispatch|Escalate|Note)\s*:\s*(.*)$/i);
    if (!m) continue;
    const kind = m[1].toLowerCase().replace(' ', '-');
    const entry = { kind, title: m[2].trim(), body: s.body.trim() };
    if (kind === 'verify') {
      const exits = [...s.body.matchAll(/exit\s*(?:code)?\s*[:=]?\s*(\d+)/gi)].map((m) => Number(m[1]));
      entry.exit = exits.length ? Math.max(...exits) : null;
      entry.command = (s.body.match(/`([^`]+)`/) || [])[1] ?? null;
      entry.tree = (s.body.match(/\btree\s*[:=]?\s*([0-9a-f]{7,40})\b/i) || [])[1] ?? null;
    }
    if (kind === 'dispatch') {
      const dm = entry.title.match(/(light|standard|deep)/i);
      entry.tier = dm ? dm[1].toLowerCase() : null;
      entry.task = (entry.title.match(/task\s*([\d.]+)/i) || [])[1] ?? null;
      const rm = s.body.match(/^\s*Result:\s*(pass|fail|accepted|rejected|ok)\b/im);
      entry.result = rm ? (/^(pass|accepted|ok)$/i.test(rm[1]) ? 'pass' : 'fail') : null;
    }
    if (kind === 'escalate') {
      const em = entry.title.match(/(light|standard|deep)\s*(?:→|->|to)\s*(light|standard|deep)/i);
      entry.from = em ? em[1].toLowerCase() : null;
      entry.to = em ? em[2].toLowerCase() : null;
    }
    if (kind === 'root-cause') entry.category = entry.title.split(/\s/)[0].toLowerCase();
    out.push(entry);
  }
  return out;
}

export const ROOT_CAUSES = ['missing-rule', 'cross-layer', 'propagation', 'test-gap', 'implicit-assumption', 'guessed-fix'];

/**
 * Specs: "## Requirement: Name" blocks each holding "### Scenario: …" blocks.
 * Delta specs use "## ADDED Requirements" / "## MODIFIED Requirements" / "## REMOVED Requirements"
 * containing "### Requirement: Name" blocks.
 */
export function parseSpec(text) {
  const source = normalizeNewlines(text);
  const { data, body } = parseFrontmatter(source);
  const reqs = [];
  const decisions = [];
  let purpose = '';
  for (const s of sections(body, 2)) {
    const rm = s.title.match(/^Requirement:\s*(.+)$/i);
    if (rm) reqs.push({ name: rm[1].trim(), body: s.body.trim() });
    else if (/^Requirements$/i.test(s.title)) {
      for (const r of sections(s.body, 3)) {
        const requirement = r.title.match(/^Requirement:\s*(.+)$/i);
        if (requirement) reqs.push({ name: requirement[1].trim(), body: r.body.trim() });
      }
    }
    else if (/^Decisions?$/i.test(s.title)) decisions.push(...s.body.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim()));
    else if (/^Purpose$/i.test(s.title)) purpose = s.body.trim();
  }
  const name = headings(body).find((h) => h.level === 1)?.title ?? '';
  return {
    data,
    name,
    purpose,
    requirements: reqs,
    decisions,
    body,
    // Keep the normalized source and its semantic snapshot. This lets callers
    // round-trip a parsed contract without silently dropping sections the
    // renderer does not own, while still falling back to canonical rendering
    // after they edit any semantic field.
    source,
    snapshot: JSON.stringify({ data, name, purpose, requirements: reqs, decisions }),
  };
}

export function parseDelta(text) {
  const out = { added: [], modified: [], removed: [], issues: [] };
  const seen = new Set();
  for (const s of sections(text, 2)) {
    const m = s.title.match(/^(ADDED|MODIFIED|REMOVED)\s+Requirements?$/i);
    if (!m) {
      if (/Requirements?$/i.test(s.title)) out.issues.push(`unrecognized requirements section "${s.title}"`);
      continue;
    }
    const key = m[1].toLowerCase();
    if (seen.has(key)) out.issues.push(`duplicate ${m[1].toUpperCase()} Requirements section`);
    seen.add(key);
    const before = out[key].length;
    for (const r of sections(s.body, 3)) {
      const rm = r.title.match(/^Requirement:\s*(.+)$/i);
      if (rm) {
        out[key].push({ name: rm[1].trim(), body: shiftHeadings(r.body.trim(), -1) });
      } else if (/^Requirement:\s*$/i.test(r.title)) {
        out.issues.push(`${m[1].toUpperCase()} Requirements has a requirement with no name`);
      }
    }
    // Empty ADDED/MODIFIED sections are useful template no-ops.  Prose (or an
    // unrelated heading) in either section is almost certainly a malformed
    // delta and must not be silently treated as an empty change.
    if (['added', 'modified'].includes(key) && s.body.trim() && out[key].length === before) {
      out.issues.push(`${m[1].toUpperCase()} Requirements has content but no Requirement sections`);
    }
  }
  if (!seen.size) out.issues.push('contains no ADDED, MODIFIED, or REMOVED Requirements section');
  return out;
}

function shiftHeadings(text, by) {
  const lines = normalizeNewlines(text).split('\n');
  const byLine = new Map(headings(text).map((h) => [h.line, h]));
  return lines.map((line, i) => {
    const heading = byLine.get(i);
    if (!heading || heading.level + by < 1) return line;
    return line.replace(/^ {0,3}#+/, '#'.repeat(heading.level + by));
  }).join('\n');
}

export function hasScenario(text) {
  return headings(text).some((heading) => heading.level >= 3 && /^Scenario:\s*\S/i.test(heading.title));
}

export const requirementKey = (name) => String(name ?? '').normalize('NFC').toLocaleLowerCase();

const renderRequirement = (level, requirement) => `${'#'.repeat(level)} Requirement: ${requirement.name}\n\n${requirement.body}\n`;

function headingRanges(text, level) {
  const lines = normalizeNewlines(text).split('\n');
  const found = headings(text).filter((h) => h.level === level);
  return found.map((heading) => {
    const next = headings(text).find((h) => h.line > heading.line && h.level <= level)?.line ?? lines.length;
    return { heading, start: heading.line, end: next, raw: lines.slice(heading.line, next).join('\n') + (next < lines.length ? '\n' : '') };
  });
}

function rewriteOpenSpecRequirements(raw, take) {
  const lines = raw.split('\n');
  const ranges = headingRanges(raw, 3);
  if (!ranges.length) return raw;
  let out = lines.slice(0, ranges[0].start).join('\n');
  if (ranges[0].start) out += '\n';
  for (const range of ranges) {
    const match = range.heading.title.match(/^Requirement:\s*(.+)$/i);
    if (!match) { out += range.raw; continue; }
    const current = take(match[1].trim());
    if (!current) continue;
    const oldBody = range.raw.split('\n').slice(1).join('\n').trim();
    out += current.name === match[1].trim() && current.body === oldBody
      ? range.raw
      : renderRequirement(3, current);
  }
  return out;
}

/**
 * Update only Requirement blocks in a parsed source.  Unknown sections, exact
 * frontmatter, and fenced examples are copied verbatim instead of being
 * reconstructed from the small semantic view used by Keelson.
 */
function renderUpdatedRequirements(spec) {
  const available = spec.requirements.map((requirement) => ({ requirement, used: false }));
  const take = (name) => {
    const entry = available.find((candidate) => !candidate.used && requirementKey(candidate.requirement.name) === requirementKey(name));
    if (entry) entry.used = true;
    return entry?.requirement ?? null;
  };
  const lines = spec.source.split('\n');
  const ranges = headingRanges(spec.source, 2);
  const prefixEnd = ranges[0]?.start ?? lines.length;
  let out = lines.slice(0, prefixEnd).join('\n') + (prefixEnd && prefixEnd < lines.length ? '\n' : '');
  for (const range of ranges) {
    const legacy = range.heading.title.match(/^Requirement:\s*(.+)$/i);
    if (legacy) {
      const current = take(legacy[1].trim());
      if (!current) continue;
      const oldBody = range.raw.split('\n').slice(1).join('\n').trim();
      out += current.name === legacy[1].trim() && current.body === oldBody
        ? range.raw
        : renderRequirement(2, current);
    } else if (/^Requirements$/i.test(range.heading.title)) {
      out += rewriteOpenSpecRequirements(range.raw, take);
    } else {
      out += range.raw;
    }
  }
  const added = available.filter((entry) => !entry.used).map((entry) => entry.requirement);
  if (added.length) {
    if (out && !out.endsWith('\n')) out += '\n';
    if (out && !out.endsWith('\n\n')) out += '\n';
    out += added.map((requirement) => renderRequirement(2, requirement)).join('\n');
  }
  return out;
}

export function renderSpec(spec) {
  const { name, purpose = '', requirements = [], decisions = [] } = spec;
  const now = JSON.stringify({
    data: spec.data ?? {},
    name: name ?? '',
    purpose,
    requirements,
    decisions,
  });
  if (spec.source && spec.snapshot === now) return spec.source;
  if (spec.source && spec.snapshot) {
    const previous = JSON.parse(spec.snapshot);
    // Landing only changes requirements and appends decisions.  Preserve all
    // foreign Markdown in that normal path; canonical rendering remains the
    // fallback for callers that replace the document's other owned fields.
    const decisionsAppendOnly = decisions.length >= previous.decisions.length
      && previous.decisions.every((decision, i) => decisions[i] === decision);
    if (name === previous.name && purpose === previous.purpose && decisionsAppendOnly) {
      let source = renderUpdatedRequirements({ ...spec, requirements });
      const appended = decisions.slice(previous.decisions.length);
      if (appended.length) {
        const decisionSections = headingRanges(source, 2).filter((range) => /^Decisions?$/i.test(range.heading.title));
        if (decisionSections.length) {
          const last = decisionSections.at(-1);
          const before = source.split('\n').slice(0, last.end).join('\n');
          const after = source.split('\n').slice(last.end).join('\n');
          source = `${before.replace(/\n*$/, '\n\n')}${appended.map((decision) => `- ${decision}`).join('\n')}\n${after}`;
        } else {
          source = `${source.replace(/\n*$/, '\n\n')}## Decisions\n\n${appended.map((decision) => `- ${decision}`).join('\n')}\n`;
        }
      }
      return source;
    }
  }
  const parts = [`# ${name}`, ''];
  if (purpose) parts.push('## Purpose', '', purpose, '');
  for (const r of requirements) parts.push(`## Requirement: ${r.name}`, '', r.body, '');
  if (decisions?.length) parts.push('## Decisions', '', ...decisions.map((d) => `- ${d}`), '');
  return parts.join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Handoff: frontmatter (at, updated, by) + sections. Returns the "Next step" text for hooks and status. */
export function parseHandoff(text) {
  const { data, body } = parseFrontmatter(text);
  const secs = sections(body, 2);
  const pick = (re) => secs.find((s) => re.test(s.title))?.body.trim() ?? '';
  return {
    at: data.at ?? null,
    updated: data.updated ?? null,
    by: data.by ?? null,
    next: pick(/^Next/i),
    open: pick(/^Open|^Blocked/i),
    verification: pick(/^Verification/i),
    body,
  };
}
