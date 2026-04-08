'use strict';
/**
 * generate-applitools-report.js
 *
 * Generates a self-contained HTML report for Applitools Eyes visual test results.
 * Reads applitools-results.json (written by global-teardown.js after test runs)
 * and also extracts per-test Applitools URLs from test-results.json (Playwright).
 *
 * Output: custom-report/applitools-report.html
 *
 * Usage:
 *   node scripts/generate-applitools-report.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT                = path.resolve(__dirname, '..');
const APPLITOOLS_FILE     = path.join(ROOT, 'applitools-results.json');
const PLAYWRIGHT_FILE     = path.join(ROOT, 'test-results.json');
const OUT_DIR             = path.join(ROOT, 'custom-report');
const OUT_FILE            = path.join(OUT_DIR, 'applitools-report.html');

// ANSI colours for terminal output
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';

// ─── Extract Applitools info from Playwright JSON results ─────────────────────
function extractFromPlaywright() {
  if (!fs.existsSync(PLAYWRIGHT_FILE)) return [];
  const raw = JSON.parse(fs.readFileSync(PLAYWRIGHT_FILE, 'utf-8'));
  const tests = [];

  function walkSuites(suites, parentFile) {
    for (const suite of (suites || [])) {
      const file = suite.file || parentFile || '';
      if (suite.suites && suite.suites.length) {
        walkSuites(suite.suites, file);
      }
      for (const spec of (suite.specs || [])) {
        const keyMatch  = path.basename(file).match(/^(SCRUM-T\d+)_/i);
        const zephyrKey = keyMatch ? keyMatch[1].toUpperCase() : '';

        let applitoolsUrl = null;
        let testStatus = 'unknown';

        if (Array.isArray(spec.tests) && spec.tests.length) {
          const lastTest = spec.tests[spec.tests.length - 1];
          if (Array.isArray(lastTest.results) && lastTest.results.length) {
            const lastResult = lastTest.results[lastTest.results.length - 1];
            testStatus = lastResult.status || 'unknown';

            for (const att of (lastResult.attachments || [])) {
              if (att.name === 'Applitools Results' && att.contentType === 'text/plain') {
                applitoolsUrl = att.body
                  ? Buffer.from(att.body, 'base64').toString('utf8').trim()
                  : null;
              }
            }
          }
        }

        if (applitoolsUrl) {
          tests.push({
            name: spec.title,
            zephyrKey,
            applitoolsUrl,
            testStatus,
          });
        }
      }
    }
  }

  walkSuites(raw.suites || []);
  return tests;
}

// ─── Merge Applitools runner results with Playwright attachment data ──────────
function loadResults() {
  let runnerData = { passed: 0, failed: 0, unresolved: 0, urls: [], tests: [] };
  if (fs.existsSync(APPLITOOLS_FILE)) {
    try {
      runnerData = JSON.parse(fs.readFileSync(APPLITOOLS_FILE, 'utf-8'));
    } catch (err) {
      console.warn(`${YELLOW}⚠ Failed to parse applitools-results.json: ${err.message}${RESET}`);
    }
  }

  const pwTests = extractFromPlaywright();

  return { runnerData, pwTests };
}

// ─── HTML escape ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Duration formatter ──────────────────────────────────────────────────────
function fmtDuration(sec) {
  if (!sec || sec <= 0) return '–';
  if (sec >= 60) return `${(sec / 60).toFixed(1)}m`;
  return `${sec.toFixed(1)}s`;
}

// ─── Build HTML report ───────────────────────────────────────────────────────
function buildHtml(runnerData, pwTests) {
  const runDate  = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const total    = runnerData.tests.length;
  const passed   = runnerData.passed;
  const failed   = runnerData.failed;
  const unresolved = runnerData.unresolved;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Pie chart using conic-gradient
  const pPass = total ? (passed / total) * 360 : 0;
  const pFail = total ? (failed / total) * 360 : 0;
  const pieGrad = [
    `#4caf50 0deg ${pPass}deg`,
    `#f44336 ${pPass}deg ${pPass + pFail}deg`,
    `#ff9800 ${pPass + pFail}deg 360deg`
  ].join(', ');

  // ── Runner test cards (from Applitools runner) ──
  const runnerCards = runnerData.tests.map((t, idx) => {
    const statusClass = t.status === 'Passed' ? 'pass' : t.status === 'Failed' ? 'fail' : 'unresolved';
    const statusIcon  = t.status === 'Passed' ? '✓' : t.status === 'Failed' ? '✗' : '?';
    const isNew       = t.isNew ? '<span class="badge new">NEW BASELINE</span>' : '';

    return `
    <tr class="${statusClass}">
      <td class="idx">${idx + 1}</td>
      <td class="test-name">${escHtml(t.name)} ${isNew}</td>
      <td class="host">${escHtml(t.hostApp || '–')} / ${escHtml(t.hostOS || '–')}</td>
      <td class="steps-count">${t.steps}</td>
      <td class="matches">${t.matches}</td>
      <td class="mismatches">${t.mismatches > 0 ? `<span class="mismatch-count">${t.mismatches}</span>` : '0'}</td>
      <td class="missing">${t.missing > 0 ? `<span class="missing-count">${t.missing}</span>` : '0'}</td>
      <td class="duration">${fmtDuration(t.duration)}</td>
      <td class="status-cell">
        <span class="status-badge ${statusClass}">${statusIcon} ${t.status}</span>
      </td>
      <td class="link">
        ${t.url ? `<a href="${escHtml(t.url)}" target="_blank" class="eyes-link">View →</a>` : '–'}
      </td>
    </tr>`;
  }).join('\n');

  // ── Per-test Applitools links (from Playwright attachments) ──
  const pwCards = pwTests.map((t, idx) => `
    <tr>
      <td class="idx">${idx + 1}</td>
      <td class="zkey">${escHtml(t.zephyrKey)}</td>
      <td class="test-name">${escHtml(t.name)}</td>
      <td class="pw-status">${t.testStatus === 'passed' ? '<span class="status-badge pass">✓ Passed</span>' : '<span class="status-badge fail">✗ Failed</span>'}</td>
      <td class="link"><a href="${escHtml(t.applitoolsUrl)}" target="_blank" class="eyes-link">Dashboard →</a></td>
    </tr>`).join('\n');

  const hasRunnerData = total > 0;
  const hasPwData     = pwTests.length > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Applitools Eyes — Visual Test Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5; color: #212121;
  }

  /* ── Header ──────────────────────────────────────────────────────────── */
  header {
    background: linear-gradient(135deg, #1b5e20 0%, #388e3c 100%);
    color: #fff; padding: 24px 32px;
    display: flex; justify-content: space-between; align-items: center;
  }
  header h1 { font-size: 1.5rem; font-weight: 600; }
  header h1 .icon { font-size: 1.8rem; margin-right: 8px; }
  header .meta { font-size: 0.85rem; opacity: 0.85; text-align: right; }
  header .meta div { margin-bottom: 2px; }
  .nav-links { margin-top: 6px; }
  .nav-links a {
    color: #fff; text-decoration: none; background: rgba(255,255,255,0.15);
    padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; margin-left: 6px;
  }
  .nav-links a:hover { background: rgba(255,255,255,0.3); }

  /* ── Summary Cards ───────────────────────────────────────────────────── */
  .summary { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
  .summary-card {
    flex: 1; min-width: 140px; background: #fff; border-radius: 8px;
    padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); text-align: center;
  }
  .summary-card .value { font-size: 2rem; font-weight: 700; }
  .summary-card .label { font-size: 0.8rem; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .summary-card.passed .value  { color: #2e7d32; }
  .summary-card.failed .value  { color: #c62828; }
  .summary-card.unresolved .value { color: #e65100; }
  .summary-card.total .value   { color: #1565c0; }
  .summary-card.rate .value    { color: #2e7d32; }

  .pie-card { display: flex; align-items: center; gap: 16px; }
  .pie {
    width: 80px; height: 80px; border-radius: 50%;
    background: conic-gradient(${pieGrad});
    flex-shrink: 0;
  }

  /* ── Section ─────────────────────────────────────────────────────────── */
  .section { padding: 16px 32px 24px; }
  .section h2 {
    font-size: 1.1rem; font-weight: 600; color: #37474f;
    border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 16px;
  }
  .section h2 .count { color: #78909c; font-weight: 400; font-size: 0.9rem; }

  /* ── Tables ──────────────────────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  thead th {
    background: #37474f; color: #fff; padding: 10px 12px; text-align: left;
    font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;
  }
  tbody td { padding: 10px 12px; font-size: 0.88rem; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tbody tr:hover { background: #f5f7fa; }
  tbody tr.pass    { border-left: 3px solid #4caf50; }
  tbody tr.fail    { border-left: 3px solid #f44336; background: #fff5f5; }
  tbody tr.unresolved { border-left: 3px solid #ff9800; background: #fff8e1; }

  .idx { width: 40px; text-align: center; color: #999; }
  .test-name { font-weight: 500; }
  .host { color: #78909c; font-size: 0.82rem; }
  .steps-count, .matches, .mismatches, .missing, .duration { text-align: center; }
  .mismatch-count { color: #c62828; font-weight: 600; }
  .missing-count  { color: #e65100; font-weight: 600; }

  .status-badge {
    display: inline-block; padding: 3px 10px; border-radius: 12px;
    font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
  }
  .status-badge.pass       { background: #e8f5e9; color: #2e7d32; }
  .status-badge.fail       { background: #ffebee; color: #c62828; }
  .status-badge.unresolved { background: #fff3e0; color: #e65100; }

  .badge.new {
    display: inline-block; padding: 2px 6px; border-radius: 3px;
    font-size: 0.7rem; font-weight: 700; background: #e3f2fd; color: #1565c0;
    margin-left: 6px; vertical-align: middle;
  }

  .eyes-link {
    color: #1565c0; text-decoration: none; font-weight: 500; font-size: 0.85rem;
  }
  .eyes-link:hover { text-decoration: underline; }

  .zkey { color: #1565c0; font-weight: 600; font-size: 0.85rem; }
  .pw-status { text-align: center; }

  /* ── Empty state ─────────────────────────────────────────────────────── */
  .empty-state {
    text-align: center; padding: 48px 32px; color: #999;
  }
  .empty-state .icon { font-size: 3rem; margin-bottom: 12px; }
  .empty-state p { font-size: 1rem; }
  .empty-state code { background: #f5f5f5; padding: 2px 8px; border-radius: 4px; font-size: 0.9rem; }

  /* ── Config section ───────────────────────────────────────────────────── */
  .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
  .config-item {
    background: #fff; border-radius: 6px; padding: 12px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .config-item .key { font-size: 0.75rem; text-transform: uppercase; color: #78909c; letter-spacing: 0.5px; }
  .config-item .val { font-size: 0.95rem; font-weight: 500; margin-top: 2px; }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  footer {
    text-align: center; padding: 16px; font-size: 0.78rem; color: #999;
    border-top: 1px solid #e0e0e0; margin-top: 24px;
  }

  @media (max-width: 768px) {
    .summary { flex-direction: column; }
    header { flex-direction: column; gap: 8px; }
    .section { padding: 12px 16px; }
    table { font-size: 0.8rem; }
  }
</style>
</head>
<body>

<header>
  <div>
    <h1><span class="icon">👁</span> Applitools Eyes — Visual Test Report</h1>
  </div>
  <div class="meta">
    <div>Generated: ${runDate}</div>
    <div>App: ${escHtml(runnerData.tests[0]?.appName || 'OrangeHRM')}</div>
    <div class="nav-links">
      <a href="index.html">← Main Report</a>
      <a href="../allure-report/index.html">Allure Report</a>
    </div>
  </div>
</header>

${hasRunnerData ? `
<!-- ── Summary Cards ──────────────────────────────────────────────────── -->
<div class="summary">
  <div class="summary-card total">
    <div class="value">${total}</div>
    <div class="label">Total Visual Tests</div>
  </div>
  <div class="summary-card passed">
    <div class="value">${passed}</div>
    <div class="label">Passed</div>
  </div>
  <div class="summary-card failed">
    <div class="value">${failed}</div>
    <div class="label">Failed</div>
  </div>
  <div class="summary-card unresolved">
    <div class="value">${unresolved}</div>
    <div class="label">Unresolved</div>
  </div>
  <div class="summary-card rate pie-card">
    <div class="pie"></div>
    <div>
      <div class="value">${passRate}%</div>
      <div class="label">Pass Rate</div>
    </div>
  </div>
</div>

<!-- ── Runner Results Table ────────────────────────────────────────────── -->
<div class="section">
  <h2>Visual Test Results <span class="count">(${total} tests)</span></h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Test Name</th>
        <th>Browser / OS</th>
        <th>Steps</th>
        <th>Matches</th>
        <th>Mismatches</th>
        <th>Missing</th>
        <th>Duration</th>
        <th>Status</th>
        <th>Dashboard</th>
      </tr>
    </thead>
    <tbody>
      ${runnerCards}
    </tbody>
  </table>
</div>
` : `
<div class="empty-state">
  <div class="icon">👁</div>
  <p>No Applitools runner data found.</p>
  <p>Run tests with <code>APPLITOOLS_API_KEY</code> set to generate visual test data.</p>
</div>
`}

${hasPwData ? `
<!-- ── Per-Test Applitools Links ───────────────────────────────────────── -->
<div class="section">
  <h2>Playwright Test ↔ Applitools Mapping <span class="count">(${pwTests.length} tests with visual checks)</span></h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Zephyr Key</th>
        <th>Test Name</th>
        <th>Test Status</th>
        <th>Applitools Dashboard</th>
      </tr>
    </thead>
    <tbody>
      ${pwCards}
    </tbody>
  </table>
</div>
` : ''}

<!-- ── Configuration Summary ───────────────────────────────────────────── -->
<div class="section">
  <h2>Applitools Configuration</h2>
  <div class="config-grid">
    <div class="config-item">
      <div class="key">API Key</div>
      <div class="val">${process.env.APPLITOOLS_API_KEY ? '✅ Configured' : '⚠ Not set'}</div>
    </div>
    <div class="config-item">
      <div class="key">App Name</div>
      <div class="val">${escHtml(process.env.APPLITOOLS_APP_NAME || 'OrangeHRM')}</div>
    </div>
    <div class="config-item">
      <div class="key">Match Level</div>
      <div class="val">${escHtml(process.env.APPLITOOLS_MATCH_LEVEL || 'Strict')}</div>
    </div>
    <div class="config-item">
      <div class="key">Ultrafast Grid</div>
      <div class="val">${process.env.USE_ULTRAFAST_GRID === 'true' ? '✅ Enabled' : '❌ Disabled (Classic)'}</div>
    </div>
    <div class="config-item">
      <div class="key">Concurrency</div>
      <div class="val">${process.env.APPLITOOLS_CONCURRENCY || '5'}</div>
    </div>
    <div class="config-item">
      <div class="key">Server URL</div>
      <div class="val">${escHtml(process.env.APPLITOOLS_SERVER_URL || 'https://eyesapi.applitools.com')}</div>
    </div>
    <div class="config-item">
      <div class="key">Batch ID</div>
      <div class="val">${process.env.APPLITOOLS_BATCH_ID || 'Auto-generated'}</div>
    </div>
    <div class="config-item">
      <div class="key">Specs with Visual Checks</div>
      <div class="val">SCRUM-T53, SCRUM-T59, SCRUM-T63</div>
    </div>
  </div>
</div>

<footer>
  Applitools Eyes Visual Test Report — Agentic QA Platform
</footer>

</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log(`\n${CYAN}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║    Applitools Eyes — Report Generator            ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════════╝${RESET}\n`);

  const { runnerData, pwTests } = loadResults();

  const hasRunnerData = runnerData.tests && runnerData.tests.length > 0;
  const hasPwData     = pwTests.length > 0;

  if (!hasRunnerData && !hasPwData) {
    console.log(`${YELLOW}  ⚠ No Applitools visual test data found.${RESET}`);
    console.log(`    Ensure APPLITOOLS_API_KEY is set and tests have been run.`);
    console.log(`    Expected files:`);
    console.log(`      • applitools-results.json  (from global-teardown)`);
    console.log(`      • test-results.json        (Playwright JSON reporter)\n`);

    // Still generate the report (shows empty state + config section)
  }

  if (hasRunnerData) {
    console.log(`  ${GREEN}✅ Runner Results: ${runnerData.passed} passed, ${runnerData.failed} failed, ${runnerData.unresolved} unresolved${RESET}`);
    console.log(`     Total visual tests: ${runnerData.tests.length}`);
    if (runnerData.urls.length > 0) {
      console.log(`     Dashboard: ${runnerData.urls[0]}`);
    }
  }

  if (hasPwData) {
    console.log(`  ${GREEN}✅ Playwright Attachments: ${pwTests.length} tests with Applitools links${RESET}`);
  }

  // Generate HTML
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const html = buildHtml(runnerData, pwTests);
  fs.writeFileSync(OUT_FILE, html, 'utf-8');

  console.log(`\n  📄 Report: ${GREEN}${path.relative(ROOT, OUT_FILE)}${RESET}`);
  console.log(`     Open in browser to view the Applitools visual test report.\n`);
}

main();
