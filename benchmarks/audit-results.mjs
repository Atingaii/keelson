#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const clarification = /\b(clarify|clarification|need (?:more|additional) (?:information|details)|could you (?:clarify|confirm)|please (?:clarify|confirm)|should i)\b/i;
const reopen = /\b(reopen|reconsider|renegotiate|ambiguous|unclear|need (?:a )?decision|ask.*(?:d-17|decision))\b/i;

function events(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

function excerpts(items, expression) {
  return items.flatMap(({ index, text, kind }) => expression.test(text)
    ? [{ index, kind, text: text.slice(0, 500) }] : []);
}

function isTestExecution(command) {
  // A source search can mention "pytest" in its pattern. Count only commands
  // that invoke a test runner, after stripping a common shell wrapper. Compound
  // shell commands are valid when one segment actually runs pytest.
  const normalized = command.replace(/^\s*\/bin\/bash\s+-lc\s+['"]?/, '').trim();
  return normalized.split(/&&|;|\|\||\r?\n/).some((segment) => {
    const executable = segment.trim().replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=[^\s]+\s+)*/, '');
    if (/^(?:rg|grep|sed|awk|cat|head|tail|less|more|find)\b/.test(executable)) return false;
    return /^(?:python(?:3(?:\.\d+)?)?\s+-m\s+pytest|pytest|tox|nox|keelson\s+check)(?:\s|$)/.test(executable);
  });
}

function outputExcerpt(output) {
  if (typeof output !== 'string') return null;
  const lines = output.trim().split('\n').filter(Boolean);
  return lines.slice(-8).join('\n').slice(-1200) || null;
}

function completionCoverage(message) {
  if (!message) return 'missing';
  const mentionsChanged = /\b(changed|implemented|updated|fixed|added|modified)\b/i.test(message);
  const mentionsVerification = /\b(test|pytest|verification|suite)\b/i.test(message);
  const hasClosure = /\b(passes|passed|completed|complete|verified|verification ran|all tests)\b/i.test(message);
  if (mentionsChanged && mentionsVerification && hasClosure) return 'closing-summary-observed';
  if (mentionsChanged || mentionsVerification || hasClosure) return 'non-closing-or-partial';
  return 'non-closing-or-partial';
}

function lifecycleAudit(source) {
  const lifecycles = new Map();
  for (const [index, event] of source.entries()) {
    const id = event.item?.id;
    if (!id || !/^item_\d+$/.test(id)) continue;
    const entry = lifecycles.get(id) ?? { id, indexes: [], started: false, completed: false, type: event.item?.type ?? null };
    entry.indexes.push(index);
    entry.started ||= event.type === 'item.started';
    entry.completed ||= event.type === 'item.completed';
    lifecycles.set(id, entry);
  }
  const entries = [...lifecycles.values()];
  const ids = entries.map((entry) => Number(entry.id.slice(5))).sort((a, b) => a - b);
  const idGaps = [];
  for (let i = 1; i < ids.length; i += 1) for (let value = ids[i - 1] + 1; value < ids[i]; value += 1) idGaps.push(value);
  const startedWithoutCompletion = entries.filter((entry) => entry.started && !entry.completed).map(({ id, type, indexes }) => ({ id, type, indexes }));
  const completedWithoutStart = entries.filter((entry) => !entry.started && entry.completed).map(({ id, type, indexes }) => ({ id, type, indexes }));
  const turnCompleted = source.some((event) => event.type === 'turn.completed');
  return {
    turn_completed_observed: turnCompleted,
    started_without_completed: startedWithoutCompletion,
    completed_without_started: completedWithoutStart,
    item_id_gaps: idGaps,
    // Completed-only agent messages are normal in this stream. A started item
    // without completion, a gap, or a missing terminal turn makes capture
    // unsuitable for claims about final discourse or token accounting.
    evidence_capture_complete: turnCompleted && startedWithoutCompletion.length === 0 && idGaps.length === 0,
  };
}

function claimedTestCounts(message) {
  if (!message) return [];
  const counts = [
    ...message.matchAll(/\b(\d+)\s+(?:tests?|passed)\b/gi),
    ...message.matchAll(/\btests?\s+passed\s*\(?\s*(\d+)\b/gi),
    ...message.matchAll(/\bpassed\s*\(\s*(\d+)\b/gi),
  ].map((match) => Number(match[1]));
  return [...new Set(counts)];
}

function commandPassedCounts(commands) {
  return commands.flatMap((command) => command.output_passed_counts ?? []);
}

function auditCell(dir) {
  const raw = path.join(dir, 'codex.events.jsonl');
  if (!fs.existsSync(raw)) return null;
  const source = events(raw);
  const items = source.flatMap((event, index) => {
    const item = event.item;
    if (!item) return [];
    if (item.type === 'agent_message' && typeof item.text === 'string') return [{ index, kind: 'agent_message', text: item.text }];
    if (item.type === 'command_execution' && typeof item.command === 'string' && event.type === 'item.completed') {
      const output = item.aggregated_output ?? '';
      return [{ index, kind: 'command', text: item.command, exit_code: item.exit_code, output_excerpt: outputExcerpt(output), output_passed_counts: [...output.matchAll(/\b(\d+)\s+passed\b/gi)].map((match) => Number(match[1])) }];
    }
    return [];
  });
  const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const isD17 = summary.task === 'flask-teardown-errors';
  const commands = items.filter((item) => item.kind === 'command');
  const agentMessages = items.filter((item) => item.kind === 'agent_message');
  const finalMessage = agentMessages.at(-1)?.text ?? null;
  const verificationCommands = commands.filter((item) => isTestExecution(item.text));
  const lifecycle = lifecycleAudit(source);
  const claims = claimedTestCounts(finalMessage);
  const executedCounts = commandPassedCounts(verificationCommands);
  const finalClaimsVerificationPass = /\b(all )?(tests?|verification)\b[\s\S]{0,80}\b(pass(?:ed)?|success(?:ful(?:ly)?)?)\b|\b(pass(?:ed)?|success(?:ful(?:ly)?)?)\b[\s\S]{0,80}\b(tests?|verification)\b/i.test(finalMessage ?? '');
  const report = {
    task: summary.task,
    method: summary.method,
    repetition: summary.repetition,
    raw_event_file: 'codex.events.jsonl',
    agent_message_count: agentMessages.length,
    final_agent_message: finalMessage,
    final_message_coverage: completionCoverage(finalMessage),
    event_capture: lifecycle,
    verification_commands_observed: verificationCommands,
    verification_command_exit_zero_count: verificationCommands.filter((item) => item.exit_code === 0).length,
    verification_command_passed_counts_observed: executedCounts,
    final_message_claimed_test_counts: claims,
    final_message_claimed_test_counts_match_observed_command_output: claims.length === 0
      ? null : claims.every((count) => executedCounts.includes(count)),
    final_message_mentions_verification: /\b(test|pytest|verification)\b/i.test(finalMessage ?? ''),
    final_claims_verification_pass_observed: finalClaimsVerificationPass,
    harness_regression_pass: summary.regression_pass,
    harness_acceptance_pass: summary.acceptance_pass,
    harness_mechanical_pass: summary.regression_pass === true && summary.acceptance_pass === true,
    clarification_markers: excerpts(items, clarification),
    settled_decision: isD17 ? 'D-17' : null,
    settled_decision_reopen_markers: isD17 ? excerpts(items, reopen) : [],
    limitation: 'This records observable phrases and commands in raw Codex events. Harness public and hidden outcomes, observed model test commands, and model test-count claims are intentionally separate. Command output can establish only the emitted command and its captured result, not unlogged work or causal reasoning. Missing terminal events or item gaps make behavior/token evidence incomplete without altering the independently replayable patch and harness outcome.',
  };
  fs.writeFileSync(path.join(dir, 'decision-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(root, entry.name);
    if (!entry.isDirectory()) return [];
    if (fs.existsSync(path.join(child, 'summary.json'))) return [child];
    return walk(child);
  });
}

for (const rootArg of process.argv.slice(2)) {
  const root = path.resolve(rootArg);
  const rows = walk(root).map(auditCell).filter(Boolean);
  const aggregate = {
    cells: rows.length,
    clarification_marker_cells: rows.filter((row) => row.clarification_markers.length).length,
    clarification_marker_count: rows.reduce((count, row) => count + row.clarification_markers.length, 0),
    d17_cells: rows.filter((row) => row.settled_decision === 'D-17').length,
    d17_reopen_marker_cells: rows.filter((row) => row.settled_decision_reopen_markers.length).length,
    d17_reopen_marker_count: rows.reduce((count, row) => count + row.settled_decision_reopen_markers.length, 0),
    verification_command_cells: rows.filter((row) => row.verification_commands_observed.length).length,
    final_verification_statement_cells: rows.filter((row) => row.final_message_mentions_verification).length,
    final_message_closing_summary_cells: rows.filter((row) => row.final_message_coverage === 'closing-summary-observed').length,
    final_message_nonclosing_or_missing_cells: rows.filter((row) => row.final_message_coverage !== 'closing-summary-observed').length,
    cells_with_incomplete_event_capture: rows.filter((row) => !row.event_capture.evidence_capture_complete).length,
    final_test_count_claims_with_no_matching_command_output: rows.filter((row) => row.final_message_claimed_test_counts_match_observed_command_output === false).length,
    limitation: 'Counts are an observable raw-event audit, not a claim about unexpressed agent reasoning. Mechanical harness outcomes, observed test executions, numeric test-count claims, and capture completeness are reported separately.',
    rows: rows.map(({ clarification_markers, settled_decision_reopen_markers, verification_commands_observed, ...row }) => ({
      ...row,
      verification_command_count: verification_commands_observed.length,
      verification_command_exit_zero_count: verification_commands_observed.filter((item) => item.exit_code === 0).length,
      clarification_marker_count: clarification_markers.length,
      settled_decision_reopen_marker_count: settled_decision_reopen_markers.length,
    })),
  };
  fs.writeFileSync(path.join(root, 'behavior-audit.json'), `${JSON.stringify(aggregate, null, 2)}\n`);
  process.stdout.write(`${root}: audited ${rows.length} cells\n`);
}
