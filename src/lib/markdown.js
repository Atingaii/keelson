/** Small, dependency-free helpers for the Markdown shapes Keelson relies on. */

const normalizeNewlines = (text) => String(text ?? '').replace(/\r\n?/g, '\n');

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
  const re = new RegExp(`^#{${level}}\\s+(.+)$`, 'm');
  const lines = text.split('\n');
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(new RegExp(`^(#{1,${level}})\\s+(.+)$`));
    if (m && m[1].length === level) {
      cur = { title: m[2].trim(), level, body: '' };
      out.push(cur);
    } else if (m && m[1].length < level) {
      cur = null;
    } else if (cur) {
      cur.body += (cur.body ? '\n' : '') + line;
    }
  }
  void re;
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

export const WORK_STATUSES = ['clarifying', 'in-progress', 'blocked', 'in-review', 'integrated', 'cancelled'];

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
  const { data, body } = parseFrontmatter(text);
  const reqs = [];
  const decisions = [];
  let purpose = '';
  for (const s of sections(body, 2)) {
    const rm = s.title.match(/^Requirement:\s*(.+)$/i);
    if (rm) reqs.push({ name: rm[1].trim(), body: s.body.trim() });
    else if (/^Decisions?$/i.test(s.title)) decisions.push(...s.body.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim()));
    else if (/^Purpose$/i.test(s.title)) purpose = s.body.trim();
  }
  return { data, purpose, requirements: reqs, decisions, body };
}

export function parseDelta(text) {
  const out = { added: [], modified: [], removed: [] };
  for (const s of sections(text, 2)) {
    const m = s.title.match(/^(ADDED|MODIFIED|REMOVED)\s+Requirements?$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    for (const r of sections(s.body, 3)) {
      const rm = r.title.match(/^Requirement:\s*(.+)$/i);
      if (rm) out[key].push({ name: rm[1].trim(), body: r.body.trim().replace(/^####(\s)/gm, '###$1') });
    }
  }
  return out;
}

export function renderSpec({ name, purpose, requirements, decisions }) {
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
