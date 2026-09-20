#!/usr/bin/env node
/**
 * Reproducible local CLI latency benchmark. This is deliberately a measured
 * artifact, not a CI assertion: hardware, filesystems, Node, and Git all
 * materially affect these numbers.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(REPO_ROOT, 'bin', 'keelson.js');
const FILE_COUNT = 5000;
const SAMPLES = 30;
const WARMUPS = 3;
const CHECK_COMMAND = 'node -e "process.exit(0)"';
const TARGETS_MS = {
  status: 200,
  context: 300,
  ask: 300,
  impact: 500,
  validate: 1000,
  checkEstimatedOverhead: 200,
  checkWithRecordEstimatedOverhead: 200,
  land: 2000,
  init: 3000,
};

const outputIndex = process.argv.indexOf('--out');
if (outputIndex !== -1 && (!process.argv[outputIndex + 1] || outputIndex + 2 !== process.argv.length)) {
  throw new Error('usage: node benchmarks/cli-performance.mjs [--out benchmarks/cli-performance.json]');
}
const OUTPUT = path.resolve(REPO_ROOT, outputIndex === -1 ? 'benchmarks/cli-performance.json' : process.argv[outputIndex + 1]);

const nowMs = () => Number(process.hrtime.bigint()) / 1e6;
const percentile = (samples, fraction) => {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
};
const summarize = (samples) => ({
  min: Math.min(...samples),
  p50: percentile(samples, 0.5),
  p95: percentile(samples, 0.95),
  max: Math.max(...samples),
  mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
});
const rounded = (value) => Math.round(value * 1000) / 1000;
const roundedSummary = (samples) => Object.fromEntries(Object.entries(summarize(samples)).map(([key, value]) => [key, rounded(value)]));

function run(program, args, options = {}) {
  const started = nowMs();
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, ...options });
  const elapsedMs = nowMs() - started;
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${program} ${args.join(' ')} exited ${result.status}: ${result.stderr || result.stdout}`);
  return elapsedMs;
}

function git(root, args, env) {
  return run('git', args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
}

function copyFixture(fixture, destination, env) {
  run('git', ['clone', '--quiet', '--no-hardlinks', fixture, destination], { env, stdio: ['ignore', 'pipe', 'pipe'] });
}

function createFixture(root, env) {
  fs.mkdirSync(root, { recursive: true });
  for (let i = 0; i < FILE_COUNT; i++) {
    const group = String(Math.floor(i / 100)).padStart(2, '0');
    const file = path.join(root, 'src', group, `fixture-${String(i).padStart(4, '0')}.js`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `export const fixture${i} = ${i};\n`);
  }
  git(root, ['init', '--quiet'], env);
  git(root, ['add', 'src'], env);
  git(root, ['-c', 'user.name=CLI performance fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'fixture'], env);
}

function createChange(root, name) {
  const dir = path.join(root, '.keelson', 'changes', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'change.md'), `---\ntier: quick\nstatus: in-review\n---\n# ${name}\n\n## Why\n\nMeasure CLI latency against a fixed local fixture.\n\n## What\n\n- Preserve a reproducible benchmark change.\n\n## Acceptance\n\n- [x] benchmark preparation complete — check: \`node -e "process.exit(0)"\`\n`);
}

function benchmark(name, invoke, { before = () => {}, after = () => {} } = {}) {
  const warmups = [];
  const samples = [];
  for (let i = 0; i < WARMUPS; i++) {
    before(`warmup-${i + 1}`);
    warmups.push(rounded(invoke()));
    after(`warmup-${i + 1}`);
  }
  for (let i = 0; i < SAMPLES; i++) {
    before(`sample-${i + 1}`);
    samples.push(rounded(invoke()));
    after(`sample-${i + 1}`);
  }
  return { warmups, samples, summary: roundedSummary(samples) };
}

function main() {
  const priorResult = readPriorResult();
  const priorAttempts = Array.isArray(priorResult?.attempts) ? priorResult.attempts : [];
  const startedAt = new Date().toISOString();
  const loadAverageAtStart = os.loadavg();
  const attemptId = `${startedAt.replace(/[:.]/g, '-')}-${process.pid}`;
  const groups = {};
  const persistPartial = (status, error = null) => {
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify({
      schemaVersion: 2,
      status,
      latestAttempt: {
        id: attemptId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status,
        error,
        rawWallTimesMs: groups,
      },
      attempts: [...priorAttempts, {
        id: attemptId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status,
        error,
        rawWallTimesMs: groups,
      }],
    }, null, 2)}\n`);
  };
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'keelson-cli-performance-'));
  const fakeHome = path.join(temporaryRoot, 'home');
  const fixture = path.join(temporaryRoot, 'fixture');
  const project = path.join(temporaryRoot, 'project');
  fs.mkdirSync(fakeHome, { recursive: true });
  const env = {
    ...process.env,
    HOME: fakeHome,
    USERPROFILE: fakeHome,
    XDG_CACHE_HOME: path.join(fakeHome, '.cache'),
    GIT_CONFIG_GLOBAL: path.join(fakeHome, '.gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    CODEX_THREAD_ID: '',
    KEELSON_SESSION_ID: '',
    PI_SESSION_ID: '',
  };
  const cli = (root, args) => run(process.execPath, [BIN, ...args], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const shellCheck = () => run(CHECK_COMMAND, [], { cwd: project, env, shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

  try {
    persistPartial('running');
    createFixture(fixture, env);
    const init = benchmark('init', () => {
      const target = path.join(temporaryRoot, `init-${cryptoRandomName()}`);
      copyFixture(fixture, target, env);
      try {
        return cli(target, ['init', '--tools', 'agents', '--no-hooks']);
      } finally {
        fs.rmSync(target, { recursive: true, force: true });
      }
    });
    groups.init = init;
    persistPartial('running');

    copyFixture(fixture, project, env);
    cli(project, ['init', '--tools', 'agents', '--no-hooks']);
    fs.writeFileSync(path.join(project, '.keelson', 'config.yaml'), `version: 4\ncheck:\n  - ${CHECK_COMMAND}\n`);
    createChange(project, 'bench-ask');

    // Preserve the no-record path as a separate observation. `status` still
    // fingerprints all 5,000 tracked files; it merely has no ledger to load.
    const statusWithoutSignedRecord = benchmark('status without signed record', () => cli(project, ['status', '--json']));
    groups.statusWithoutSignedRecord = statusWithoutSignedRecord;
    persistPartial('running');
    const contextWithoutSignedRecord = benchmark('context without signed record', () => cli(project, ['context', '--paths', 'src/00/fixture-0000.js', '--json']));
    groups.contextWithoutSignedRecord = contextWithoutSignedRecord;
    persistPartial('running');
    const askWithoutSignedRecord = benchmark('ask without signed record', () => cli(project, ['ask', 'frontier', '--change', 'bench-ask', '--json']));
    groups.askWithoutSignedRecord = askWithoutSignedRecord;
    persistPartial('running');
    const impactWithoutSignedRecord = benchmark('impact without signed record', () => cli(project, ['impact', 'src/00/fixture-0000.js', '--json']));
    groups.impactWithoutSignedRecord = impactWithoutSignedRecord;
    persistPartial('running');
    const validateWithoutSignedRecord = benchmark('validate without signed record', () => cli(project, ['validate', '--json']));
    groups.validateWithoutSignedRecord = validateWithoutSignedRecord;
    persistPartial('running');

    // Create the record before timing. It has the same 5,000-file worktree
    // fingerprint as the status/context samples below, while their timing
    // includes loading and verifying that fresh signed record.
    cli(project, ['check', '--trust', '--record', '--change', 'bench-ask', '--quiet']);
    const statusWithFreshSignedRecord = benchmark('status with fresh signed record', () => cli(project, ['status', '--json']));
    groups.statusWithFreshSignedRecord = statusWithFreshSignedRecord;
    persistPartial('running');
    const contextWithFreshSignedRecord = benchmark('context with fresh signed record', () => cli(project, ['context', '--paths', 'src/00/fixture-0000.js', '--json']));
    groups.contextWithFreshSignedRecord = contextWithFreshSignedRecord;
    persistPartial('running');

    const checkEndToEnd = benchmark('check without record', () => cli(project, ['check', '--trust', '--quiet']));
    groups.checkEndToEnd = checkEndToEnd;
    persistPartial('running');
    const checkCommandBaseline = benchmark('check command baseline', shellCheck);
    groups.checkCommandBaseline = checkCommandBaseline;
    persistPartial('running');
    const checkEstimatedOverheadSamples = checkEndToEnd.samples.map((sample, index) => rounded(Math.max(0, sample - checkCommandBaseline.samples[index])));
    const checkEstimatedOverhead = {
      samples: checkEstimatedOverheadSamples,
      summary: roundedSummary(checkEstimatedOverheadSamples),
      method: 'paired end-to-end `keelson check --trust --quiet` wall time minus a direct shell execution of the identical no-op command, clamped at zero',
      limitation: 'This is an estimate: the direct baseline cannot perfectly reproduce the CLI process, shell, scheduler, filesystem-cache, or child-process interactions. End-to-end check samples remain authoritative.',
    };
    groups.checkEstimatedOverhead = checkEstimatedOverhead;
    persistPartial('running');
    let currentCheckName = '';
    const checkWithRecord = benchmark('check with record', () => cli(project, ['check', '--trust', '--record', '--change', currentCheckName, '--quiet']), {
      before(label) {
        currentCheckName = `bench-check-${label}`;
        createChange(project, currentCheckName);
      },
      after() {
        fs.rmSync(path.join(project, '.keelson', 'changes', currentCheckName), { recursive: true, force: true });
      },
    });
    groups.checkWithRecord = checkWithRecord;
    const checkWithRecordEstimatedOverheadSamples = checkWithRecord.samples.map((sample, index) => rounded(Math.max(0, sample - checkCommandBaseline.samples[index])));
    const checkWithRecordEstimatedOverhead = {
      samples: checkWithRecordEstimatedOverheadSamples,
      summary: roundedSummary(checkWithRecordEstimatedOverheadSamples),
      method: 'paired end-to-end `keelson check --trust --record --change <fresh-change> --quiet` wall time minus a direct shell execution of the identical no-op command, clamped at zero',
      limitation: 'This is an estimate: record creation also has change-directory writes. The direct baseline cannot perfectly reproduce the CLI process, shell, scheduler, filesystem-cache, or child-process interactions. End-to-end check samples remain authoritative.',
    };
    groups.checkWithRecordEstimatedOverhead = checkWithRecordEstimatedOverhead;
    persistPartial('running');
    const land = benchmark('land', () => cli(project, ['land', currentLandName, '--keep']), {
      before(label) {
        currentLandName = `bench-land-${label}`;
        createChange(project, currentLandName);
        // Evidence, acceptance, and signing preparation are deliberately
        // outside the timed land command.
        cli(project, ['check', '--trust', '--record', '--change', currentLandName, '--quiet']);
      },
    });
    groups.land = land;
    persistPartial('running');

    const p95 = Object.fromEntries(Object.entries({
      status: statusWithFreshSignedRecord,
      context: contextWithFreshSignedRecord,
      ask: askWithoutSignedRecord,
      impact: impactWithoutSignedRecord,
      validate: validateWithoutSignedRecord,
      checkEstimatedOverhead,
      checkWithRecordEstimatedOverhead,
      land,
      init,
    }).map(([name, result]) => [name, result.summary.p95]));
    const targets = Object.fromEntries(Object.entries(TARGETS_MS).map(([name, targetMs]) => [name, {
      targetMs,
      p95Ms: p95[name],
      pass: p95[name] < targetMs,
    }]));
    const cpu = os.cpus()[0] ?? {};
    const result = {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      protocol: {
        trackedOrdinaryFiles: FILE_COUNT,
        samples: SAMPLES,
        warmups: WARMUPS,
        percentile: 'nearest-rank: sorted[ceil(n * 0.95) - 1]',
        checkOverheadMethod: 'paired end-to-end check wall time minus the same no-op shell command, measured separately for no-record and fresh-record paths',
        fixture: 'fresh local Git repository with 5,000 tracked one-line JavaScript files; each init sample receives an independent local clone',
        isolation: 'temporary project, temporary HOME/USERPROFILE/XDG_CACHE_HOME, and temporary Git runtime only; all are removed after the run',
        unsignedPath: 'status/context/ask/impact/validate first run against one active quick change with no signed ledger; status still fingerprints all 5,000 tracked files',
        signedPath: 'after that raw group, a complete locally signed no-op check for bench-ask is prepared before the signed status/context group',
        landPreparation: 'accepted quick change plus a locally signed complete no-op check are prepared before each timed land invocation',
      },
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpuModel: cpu.model ?? null,
        cpuCores: os.cpus().length,
        loadAverageAtStart,
        loadAverageAtEnd: os.loadavg(),
        totalMemoryBytes: os.totalmem(),
        git: capture('git', ['--version']),
        revision: capture('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD']),
      },
      commands: {
        statusWithoutSignedRecord: 'keelson status --json (no signed record)',
        contextWithoutSignedRecord: 'keelson context --paths src/00/fixture-0000.js --json (no signed record)',
        askWithoutSignedRecord: 'keelson ask frontier --change bench-ask --json (no signed record)',
        impactWithoutSignedRecord: 'keelson impact src/00/fixture-0000.js --json (no signed record)',
        validateWithoutSignedRecord: 'keelson validate --json (no signed record)',
        statusWithFreshSignedRecord: 'keelson status --json (fresh signed record)',
        contextWithFreshSignedRecord: 'keelson context --paths src/00/fixture-0000.js --json (fresh signed record)',
        checkEndToEnd: 'keelson check --trust --quiet (no record)',
        checkCommandBaseline: CHECK_COMMAND,
        checkWithRecord: 'keelson check --trust --record --change bench-check-<sample> --quiet',
        checkWithRecordEstimatedOverhead: 'paired fresh-record check wall time minus direct no-op shell command',
        land: 'keelson land bench-land-<sample> --keep',
      },
      targets,
      rawWallTimesMs: groups,
      attempts: [...priorAttempts, {
        id: attemptId,
        startedAt,
        finishedAt: new Date().toISOString(),
        status: 'completed',
        error: null,
        rawWallTimesMs: groups,
      }],
      notes: [
        'These are local measurements, not CI gates or universal performance claims.',
        'All command timing includes a fresh Node CLI process and command output capture; fixture creation, cloning, warm-up, and land evidence preparation are excluded from the corresponding measured command.',
        'The target status/context p95 values use the signed-record group. The no-signed-record group is retained as a distinct raw observation and is never presented as proof of the signed path.',
        `The host may have unrelated processes running. Load average was ${loadAverageAtStart.join(', ')} at start and ${os.loadavg().join(', ')} at result emission; this result reports observed wall time under that load and does not claim an idle-host lower bound.`,
        'Both no-record and fresh-record check overhead estimates have independent <200 ms targets; neither replaces its end-to-end samples.',
        'No Git-status filename cache is used; every CLI invocation observes the complete tracked fixture.',
      ],
    };
    const priorIterations = Array.isArray(priorResult?.iterations)
      ? priorResult.iterations
      : priorResult?.rawWallTimesMs && priorResult?.targets
        ? [{
          id: 'frozen-baseline',
          generatedAt: priorResult.generatedAt,
          environment: priorResult.environment,
          targets: priorResult.targets,
          rawWallTimesMs: priorResult.rawWallTimesMs,
          notes: priorResult.notes,
        }]
        : [];
    result.iterations = [...priorIterations, {
      id: attemptId,
      generatedAt: result.generatedAt,
      environment: result.environment,
      targets: result.targets,
      rawWallTimesMs: result.rawWallTimesMs,
      notes: result.notes,
    }];
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
    printSummary(result);
  } catch (error) {
    persistPartial('failed', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function readPriorResult() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));
  } catch {
    return null;
  }
}

let sequence = 0;
let currentLandName = '';
const cryptoRandomName = () => `${process.pid}-${sequence++}`;

function capture(program, args) {
  const result = spawnSync(program, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return result.status === 0 ? result.stdout.trim() : null;
}

function printSummary(result) {
  for (const [name, target] of Object.entries(result.targets)) {
    console.log(`${target.pass ? 'PASS' : 'MISS'} ${name}: p95 ${target.p95Ms} ms (target < ${target.targetMs} ms)`);
  }
  console.log(`wrote ${path.relative(REPO_ROOT, OUTPUT)}`);
}

main();
