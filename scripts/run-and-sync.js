'use strict';
/**
 * run-and-sync.js
 *
 * 1. Runs all Playwright tests in tests/specs/ and captures JSON results.
 * 2. Parses results — maps each spec file → Zephyr test case key (from filename).
 * 3. Creates a new Zephyr test cycle named "AutoRun-SCRUM-5-<timestamp>".
 * 4. For every test case: creates an execution in the cycle, then updates its
 *    status (Pass / Fail / Blocked / Not Executed) based on Playwright output.
 *
 * Usage:
 *   node scripts/run-and-sync.js
 */

require('dotenv').config();
const { execSync }      = require('child_process');
const fs                = require('fs');
const path              = require('path');
const axios             = require('axios');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT             = path.resolve(__dirname, '..');
const RESULTS_FILE     = path.join(ROOT, 'test-results.json');
const SPECS_DIR        = path.join(ROOT, 'tests', 'specs');

// ─── Zephyr config ────────────────────────────────────────────────────────────
const ZEPHYR_BASE  = process.env.ZEPHYR_BASE_URL  || 'https://prod-api.zephyr4jiracloud.com/v2';
const ZEPHYR_TOKEN = process.env.ZEPHYR_ACCESS_KEY;
const PROJECT_KEY  = process.env.PROJECT_KEY       || 'SCRUM';
const ISSUE_KEY    = process.env.ISSUE_KEY         || 'SCRUM-5';

function zHeaders() {
  return {
    Authorization:  ZEPHYR_TOKEN,
    'Content-Type': 'application/json',
    Accept:         'application/json'
  };
}

// ─── Status mapping ───────────────────────────────────────────────────────────
// Playwright result.status  → Zephyr status name
const STATUS_MAP = {
  passed:   'Pass',
  failed:   'Fail',
  timedOut: 'Blocked',
  skipped:  'Not Executed',
  // ok shorthand used for suite-level
  ok:       'Pass',
  notOk:    'Fail'
};

// ─── Playwright JSON parser ───────────────────────────────────────────────────
/**
 * Recursively walk the Playwright JSON reporter tree.
 *
 * Structure (Playwright v1.40+):
 *   suites[]                 ← one per spec FILE  (suite.file = basename)
 *     .suites[]              ← one per test.describe()
 *       .specs[]             ← one per test()
 *         .ok                ← boolean (after retries)
 *         .tests[].results[].status   "passed"|"failed"|"timedOut"|"skipped"
 *
 * Returns [{ zephyrKey, title, status, error }]
 */
function collectTests(suites, parentFile = '') {
  const results = [];
  for (const suite of (suites || [])) {
    const file = suite.file || parentFile;

    // Extract Zephyr key from filename  "SCRUM-T3_verify_...spec.js"
    const keyMatch  = path.basename(file).match(/^(SCRUM-T\d+)_/i);
    const zephyrKey = keyMatch ? keyMatch[1].toUpperCase() : null;

    // ── Recurse into nested describe-blocks (suite.suites) ───────────────
    if (suite.suites && suite.suites.length) {
      results.push(...collectTests(suite.suites, file));
    }

    // ── Collect leaf tests from `specs` (Playwright ≥1.40 JSON schema) ──
    for (const spec of (suite.specs || [])) {
      let finalStatus = 'Not Executed';

      if (Array.isArray(spec.tests) && spec.tests.length > 0) {
        // Use the LAST test attempt (covers retries)
        const lastTest = spec.tests[spec.tests.length - 1];
        if (Array.isArray(lastTest.results) && lastTest.results.length > 0) {
          const lastResult = lastTest.results[lastTest.results.length - 1];
          finalStatus = STATUS_MAP[lastResult.status] || 'Fail';
        } else {
          finalStatus = lastTest.status === 'expected' ? 'Pass' : 'Fail';
        }
      } else if (typeof spec.ok === 'boolean') {
        finalStatus = spec.ok ? 'Pass' : 'Fail';
      }

      results.push({
        zephyrKey,
        title:  spec.title,
        status: finalStatus,
        error:  extractError(spec)
      });
    }
  }
  return results;
}

function extractError(spec) {
  if (!Array.isArray(spec.tests)) return '';
  for (const t of spec.tests) {
    if (!Array.isArray(t.results)) continue;
    for (const r of t.results) {
      const msg = r.error && (r.error.message || (typeof r.error === 'string' ? r.error : ''));
      if (msg) return String(msg).slice(0, 300);
    }
  }
  return '';
}

/**
 * Roll up per-key: if ANY test for a key failed → Fail, else Pass.
 * Returns Map<zephyrKey, { status, error }>
 */
function rollupByKey(tests) {
  const map = new Map();
  for (const t of tests) {
    if (!t.zephyrKey) continue;
    const prev = map.get(t.zephyrKey);
    if (!prev) {
      map.set(t.zephyrKey, { status: t.status, error: t.error });
    } else if (prev.status !== 'Fail' && t.status === 'Fail') {
      map.set(t.zephyrKey, { status: 'Fail', error: t.error || prev.error });
    } else if (prev.status !== 'Fail' && t.status === 'Blocked') {
      map.set(t.zephyrKey, { status: 'Blocked', error: t.error || prev.error });
    }
  }
  return map;
}

// ─── Zephyr API calls ─────────────────────────────────────────────────────────
async function fetchTestCases() {
  const res = await axios.get(`${ZEPHYR_BASE}/testcases`, {
    headers: zHeaders(),
    params:  { projectKey: PROJECT_KEY, maxResults: 100 }
  });
  return res.data.values || res.data || [];
}

async function createCycle(name) {
  const res = await axios.post(`${ZEPHYR_BASE}/testcycles`, {
    projectKey: PROJECT_KEY,
    name,
    description: `Automated run triggered by run-and-sync.js on ${new Date().toISOString()}`
  }, { headers: zHeaders() });
  return { id: res.data.id, key: res.data.key };
}

async function createExecution(cycleKey, testCaseKey) {
  const res = await axios.post(`${ZEPHYR_BASE}/testexecutions`, {
    projectKey:   PROJECT_KEY,
    testCaseKey,
    testCycleKey: cycleKey,
    statusName:   'In Progress'
  }, { headers: zHeaders() });
  return res.data.id;
}

async function updateExecution(execId, statusName, comment = '') {
  const body = { statusName };
  if (comment) body.comment = comment;
  await axios.put(`${ZEPHYR_BASE}/testexecutions/${execId}`, body, { headers: zHeaders() });
}

// Mark a test case as Automated in Zephyr (called only after TC has been executed by Playwright)
async function markAsAutomated(tcKey) {
  try {
    await axios.put(
      `${ZEPHYR_BASE}/testcases/${tcKey}`,
      { projectKey: PROJECT_KEY, automationStatus: 'Automated' },
      { headers: zHeaders() }
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusIcon(s) {
  return s === 'Pass' ? '✓' : s === 'Fail' ? '✗' : s === 'Blocked' ? '⊘' : '○';
}

function statusColour(s) {
  if (s === 'Pass')         return '\x1b[32m'; // green
  if (s === 'Fail')         return '\x1b[31m'; // red
  if (s === 'Blocked')      return '\x1b[33m'; // yellow
  return '\x1b[90m';                           // grey
}
const RESET = '\x1b[0m';

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Playwright Run + Zephyr Status Sync                ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!ZEPHYR_TOKEN) {
    console.error('  ERROR: ZEPHYR_ACCESS_KEY not set in .env');
    process.exit(1);
  }

  // ── Step 1: Run Playwright ───────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('  Step 1 — Run Playwright Tests');
  console.log('──────────────────────────────────────────────────────\n');

  // Remove stale results file so we always get fresh output
  if (fs.existsSync(RESULTS_FILE)) fs.unlinkSync(RESULTS_FILE);

  console.log('  Running: npx playwright test ...\n');
  let playwrightExitCode = 0;
  // Pass JSON output path via env var — Playwright JSON reporter honours it
  // and playwright.config.js also sets outputFile: 'test-results.json'
  try {
    execSync('npx playwright test', {
      cwd:   ROOT,
      stdio: 'inherit',
      env:   {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: RESULTS_FILE
      }
    });
  } catch (err) {
    // Playwright exits non-zero when any test fails — that's expected
    playwrightExitCode = err.status || 1;
  }

  // ── Step 2: Parse results ────────────────────────────────────────────────
  console.log('\n──────────────────────────────────────────────────────');
  console.log('  Step 2 — Parse Test Results');
  console.log('──────────────────────────────────────────────────────\n');

  if (!fs.existsSync(RESULTS_FILE)) {
    console.error(`  ERROR: ${RESULTS_FILE} was not created. Cannot sync to Zephyr.`);
    process.exit(1);
  }

  const raw     = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  const allTests = collectTests(raw.suites || []);
  const byKey   = rollupByKey(allTests);

  console.log(`  Tests collected: ${allTests.length}`);
  console.log(`  Zephyr keys found: ${byKey.size}\n`);

  // ── Step 3: Fetch Zephyr test cases (only those with Playwright results) ─
  console.log('──────────────────────────────────────────────────────');
  console.log('  Step 3 — Fetch Test Cases from Zephyr');
  console.log('──────────────────────────────────────────────────────\n');

  const allZephyrTCs = await fetchTestCases();
  console.log(`  Total test cases in Zephyr: ${allZephyrTCs.length}`);

  // Only sync TCs that have a matching Playwright result — skip stale/old TCs
  const zephyrTCs = allZephyrTCs.filter(tc => byKey.has(tc.key));
  const skipped   = allZephyrTCs.length - zephyrTCs.length;
  console.log(`  Matched to Playwright results: ${zephyrTCs.length}`);
  if (skipped) console.log(`  Skipped (no matching spec): ${skipped}`);
  console.log();

  // ── Step 4: Create test cycle ────────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('  Step 4 — Create Test Cycle in Zephyr');
  console.log('──────────────────────────────────────────────────────\n');

  const cycleName = `AutoRun-${ISSUE_KEY}-${new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-')}`;
  const cycle     = await createCycle(cycleName);
  console.log(`  ✓ Cycle created: ${cycle.key}  (${cycleName})\n`);

  // ── Step 5: Create executions + update statuses ──────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('  Step 5 — Create & Update Executions in Zephyr');
  console.log('──────────────────────────────────────────────────────\n');

  const summary = { Pass: 0, Fail: 0, Blocked: 0, 'Not Executed': 0, error: 0 };
  const rows    = [];

  for (const tc of zephyrTCs) {
    const tcKey  = tc.key;
    const result = byKey.get(tcKey);  // always exists — we pre-filtered
    const status = result.status;
    const comment = result.error
      ? `Playwright error: ${result.error}`
      : `Automated run — cycle ${cycle.key}`;

    let execId;
    try {
      execId = await createExecution(cycle.key, tcKey);
      await updateExecution(execId, status, comment);
      summary[status] = (summary[status] || 0) + 1;

      // Mark as Automated in Zephyr
      let autoMarked = await markAsAutomated(tcKey);

      rows.push({ tcKey, name: tc.name, status, synced: true, autoMarked });
    } catch (err) {
      summary.error++;
      const msg = (err.response && JSON.stringify(err.response.data)) || err.message;
      rows.push({ tcKey, name: tc.name, status, synced: false, autoMarked: null, err: msg });
    }
  }

  // ── Step 6: Print results table ──────────────────────────────────────────
  console.log('──────────────────────────────────────────────────────');
  console.log('  Results');
  console.log('──────────────────────────────────────────────────────\n');

  for (const r of rows) {
    const col    = statusColour(r.status);
    const icon   = statusIcon(r.status);
    const name   = (r.name || '').slice(0, 50).padEnd(50);
    const synced = r.synced ? '' : ' ⚠ sync failed';
    const auto   = r.autoMarked === true  ? ` \x1b[32m[Automated ✓]\x1b[0m`
                 : r.autoMarked === false ? ` \x1b[33m[mark failed]\x1b[0m`
                 : '';
    console.log(`  ${col}${icon}${RESET} ${r.tcKey.padEnd(10)} ${name} [${col}${r.status}${RESET}]${auto}${synced}`);
    if (!r.synced && r.err) console.log(`          ${'\x1b[31m'}${r.err}${RESET}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('══════════════════════════════════════════════════════\n');
  console.log(`  Cycle     : ${cycle.key}  (${cycleName})`);
  console.log(`  Total TCs : ${zephyrTCs.length}`);
  console.log(`  \x1b[32mPass\x1b[0m      : ${summary.Pass        || 0}`);
  console.log(`  \x1b[31mFail\x1b[0m      : ${summary.Fail        || 0}`);
  console.log(`  \x1b[33mBlocked\x1b[0m   : ${summary.Blocked     || 0}`);
  console.log(`  \x1b[90mNot Exec\x1b[0m  : ${summary['Not Executed'] || 0}`);
  if (summary.error) console.log(`  \x1b[31mSync err\x1b[0m  : ${summary.error}`);
  console.log(`\n  Playwright exit code: ${playwrightExitCode === 0 ? '\x1b[32m0 (all passed)\x1b[0m' : '\x1b[31m' + playwrightExitCode + ' (some failed)\x1b[0m'}`);
  console.log(`  HTML report : playwright-report/index.html`);
  console.log('\n══════════════════════════════════════════════════════\n');

  // Exit with playwright's exit code so CI pipelines respect it
  process.exit(playwrightExitCode);
}

main().catch(err => {
  console.error('\n  FATAL:', err.message || err);
  process.exit(1);
});
