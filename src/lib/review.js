import path from 'node:path';
import { read, readJson, exists } from './fs.js';
import { contractFingerprint } from './evidence.js';
import { worktreeFingerprint } from './git.js';
import { readCapabilitySpec } from './specs.js';
import { mergeDelta, appendDecisions } from './deltas.js';
import { projectPaths } from './paths.js';
import { loadConfig } from './config.js';

export const requiresReview = (change) => change.reviewPolicy === 'independent'
  || change.tier === 'spec' || Boolean(change.deltaFiles?.length);

/** The reviewer inspects the resulting current truth, not only the new prose. */
export function reviewPacket(root, change) {
  const paths = projectPaths(root, loadConfig(projectPaths(root).config));
  const projected = new Map();
  for (const file of change.deltaFiles) {
    const capability = path.dirname(file).replace(/\\/g, '/');
    if (capability === '.' || capability.includes('<')) throw new Error('replace the placeholder capability before review');
    const prior = projected.get(capability);
    const before = prior?.before ?? readCapabilitySpec(paths.specs, capability);
    const delta = read(path.join(change.dir, 'specs', file));
    const { text: after } = mergeDelta(prior?.after ?? before, delta, capability);
    projected.set(capability, { capability, before, delta: [prior?.delta, delta].filter(Boolean).join('\n\n'), after });
  }
  const contracts = [...projected.values()];
  for (const decision of change.decisions ?? []) {
    if (!decision.capability) continue;
    let contract = contracts.find((item) => item.capability === decision.capability);
    if (!contract) {
      const before = readCapabilitySpec(paths.specs, decision.capability);
      contract = { capability: decision.capability, before, delta: '', after: before };
      contracts.push(contract);
    }
    contract.after = appendDecisions(contract.after, decision.capability, [decision.text]);
  }
  return {
    schema: 1, change: change.name,
    tree: worktreeFingerprint(root),
    contract: contractFingerprint(root, change.dir, { includeReview: false }),
    acceptance: change.acceptance.map((item) => item.text), contracts,
  };
}

export function reviewProblems(report, packet) {
  const problems = [];
  const text = (value) => typeof value === 'string' && Boolean(value.trim()) && !/^(?:…|\.\.\.|<[^>]+>)$/.test(value.trim());
  if (report?.schema !== 1 || report.change !== packet.change) return ['review schema/change does not match'];
  if (report.tree !== packet.tree || report.contract !== packet.contract) problems.push('review inputs are stale; review the current tree and contracts again');
  if (report.independent !== true || !text(report.reviewer)) problems.push('a fresh independent reviewer must be identified');
  if (!packet.acceptance.length) problems.push('review requires concrete acceptance');
  const coverage = Array.isArray(report.coverage) ? report.coverage : [];
  if (coverage.length !== packet.acceptance.length
    || new Set(coverage.map((row) => row?.acceptance)).size !== coverage.length
    || packet.acceptance.some((item) => !coverage.some((row) => row?.acceptance === item && text(row.evidence)))) {
    problems.push('cover every exact acceptance item once with observed evidence');
  }
  if (!Array.isArray(report.counterexamples) || !report.counterexamples.length
    || report.counterexamples.some((row) => !text(row?.case) || !text(row?.result))) {
    problems.push('record a discriminating counterexample and its observed result');
  }
  const contracts = Array.isArray(report.contracts) ? report.contracts : [];
  if (contracts.length !== packet.contracts.length
    || new Set(contracts.map((row) => row?.capability)).size !== contracts.length
    || packet.contracts.some(({ capability }) => !contracts.some((row) => row?.capability === capability && text(row.evidence)))) {
    problems.push('review every projected merged capability for superseded or conflicting requirements');
  }
  if (!Array.isArray(report.findings) || report.findings.some((finding) => !text(finding))) problems.push('findings must be an array of unresolved issues');
  else if (report.findings.length) problems.push(`${report.findings.length} unresolved review finding(s): ${report.findings.join('; ')}`);
  return problems;
}

export function inspectReview(root, change) {
  if (!requiresReview(change)) return { state: 'not-required', detail: 'non-behavioral quick change' };
  const file = path.join(change.dir, 'review.json');
  if (!exists(file)) return { state: 'missing', detail: 'independent acceptance review required; run `keelson review --prepare`, dispatch a fresh reviewer, then record its report' };
  try {
    const packet = reviewPacket(root, change);
    const problems = reviewProblems(readJson(file), packet);
    return problems.length ? { state: 'blocked', detail: problems.join('; ') } : { state: 'passed', detail: 'current independent review report covers acceptance and projected contracts; reviewer attribution is caller-supplied' };
  } catch (error) { return { state: 'invalid', detail: error.message }; }
}
