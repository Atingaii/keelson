import path from 'node:path';
import { requireProjectRoot, resolveWithin } from '../lib/paths.js';
import { read, writeJson, withLock } from '../lib/fs.js';
import { activeWorkflow } from '../lib/workflow.js';
import { reviewPacket, reviewProblems } from '../lib/review.js';
import { runtimeDir } from '../lib/runtime-path.js';
import { activeChecks } from '../lib/check-activity.js';

export async function review({ flags = {}, positional = [] }, cwd = process.cwd()) {
  const root = requireProjectRoot(cwd);
  return withLock(path.join(runtimeDir(root), 'landing'), () => {
    const { change } = activeWorkflow(root, flags.change ?? positional[0]);
    if (!change) throw new Error('select an active change with --change before review');
    const packet = reviewPacket(root, change);
    if (flags.prepare) {
      console.log(JSON.stringify({ ...packet, instructions: 'IMPLEMENTER: do not fill this template yourself or relabel self-checks as independent. Actually invoke a new host agent with no inherited conversation, or a new native CLI process (for Codex, use codex exec, never resume/fork). Read `keelson guide verify` for dispatch and preserve the tool/session identity. If unavailable, stop completion and report the gap. REVIEWER: read the original request and check phase context, inspect the diff, reproduce acceptance and a counterexample, and inspect the projected contracts. Fill reportTemplate with observed evidence and your actual session/tool identity; write only the report and do not dispatch another reviewer or run finish/land. Leave unresolved defects in findings. Implementation repairs, then a fresh reviewer rechecks before final check --record.', reportTemplate: {
        schema: 1, change: packet.change, tree: packet.tree, contract: packet.contract,
        independent: true, reviewer: '',
        coverage: packet.acceptance.map((acceptance) => ({ acceptance, evidence: '' })),
        counterexamples: [{ case: '', result: '' }],
        contracts: packet.contracts.map(({ capability }) => ({ capability, evidence: '' })),
        findings: [],
      } }, null, 2));
      return 0;
    }
    if (typeof flags.record !== 'string') throw new Error('use `keelson review --prepare` or `keelson review --record <project-relative-report.json>`');
    if (activeChecks(root).length) throw new Error('cannot record review while checks are running; wait for them to finish');
    const report = JSON.parse(read(resolveWithin(root, flags.record)));
    const problems = reviewProblems(report, packet);
    // Preserve a genuine failing review, but do not replace an intact report with malformed input.
    const structural = reviewProblems({ ...report, findings: [] }, packet);
    if (structural.length) throw new Error(`cannot record review: ${structural.join('; ')}`);
    if (!Array.isArray(report.findings) || report.findings.some((finding) => typeof finding !== 'string' || !finding.trim())) throw new Error('findings must be an array of unresolved issues');
    writeJson(path.join(change.dir, 'review.json'), report);
    console.log(JSON.stringify({ change: change.name, ok: problems.length === 0, problems, next: problems.length ? 'Fix the findings, then obtain a fresh review.' : 'Run the final configured check --record, then land.' }));
    return problems.length ? 1 : 0;
  });
}
