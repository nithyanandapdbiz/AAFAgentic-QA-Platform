'use strict';
/**
 * Global Teardown — runs ONCE after the entire test suite completes.
 *
 * Responsibilities:
 *   1. Parse test-results.json and print a summary table
 *   2. Log overall pass/fail/skip counts and duration
 *   3. Highlight any flaky or retried tests
 *   4. Collect Applitools Eyes runner results (visual test summary)
 */
const fs   = require('fs');
const path = require('path');

const RESULTS_FILE = path.resolve(__dirname, '..', 'test-results.json');

module.exports = async function globalTeardown() {
  console.log('\n' + '─'.repeat(52));
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           GLOBAL TEARDOWN — Summary              ║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('  ⚠ test-results.json not found — skipping summary');
    return;
  }

  try {
    const raw     = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    const suites  = raw.suites || [];
    let passed = 0, failed = 0, skipped = 0, flaky = 0, totalDuration = 0;
    const failures = [];
    const flakyTests = [];

    function walkSpecs(suites) {
      for (const suite of suites) {
        for (const spec of (suite.specs || [])) {
          for (const test of (spec.tests || [])) {
            const status = test.status || test.expectedStatus;
            const duration = (test.results || []).reduce((sum, r) => sum + (r.duration || 0), 0);
            totalDuration += duration;

            if (status === 'expected' || status === 'passed') passed++;
            else if (status === 'skipped') skipped++;
            else if (status === 'flaky') { flaky++; flakyTests.push(spec.title); }
            else { failed++; failures.push(spec.title); }
          }
        }
        if (suite.suites) walkSpecs(suite.suites);
      }
    }

    walkSpecs(suites);
    const total = passed + failed + skipped + flaky;
    const durationSec = (totalDuration / 1000).toFixed(1);

    console.log(`\n  Total Tests : ${total}`);
    console.log(`  ✅ Passed   : ${passed}`);
    console.log(`  ❌ Failed   : ${failed}`);
    console.log(`  ⏭  Skipped  : ${skipped}`);
    console.log(`  ⚡ Flaky    : ${flaky}`);
    console.log(`  ⏱  Duration : ${durationSec}s`);

    if (failures.length > 0) {
      console.log('\n  ── Failed Tests ──────────────────────────────');
      failures.forEach(t => console.log(`    ✗ ${t}`));
    }

    if (flakyTests.length > 0) {
      console.log('\n  ── Flaky Tests ───────────────────────────────');
      flakyTests.forEach(t => console.log(`    ⚡ ${t}`));
    }

    // Pass rate
    if (total > 0) {
      const rate = ((passed / total) * 100).toFixed(1);
      console.log(`\n  Pass Rate: ${rate}%`);
    }

  } catch (err) {
    console.error(`  ⚠ Failed to parse test-results.json: ${err.message}`);
  }

  // ── Applitools Visual Test Summary ──────────────────────────────────
  // Eyes results are collected per-test in base.fixture.js (JSONL format)
  // because global-teardown runs in a separate process from test workers.
  try {
    const eyesJsonlFile = path.resolve(__dirname, '..', '.applitools-results.jsonl');
    if (fs.existsSync(eyesJsonlFile)) {
      const lines = fs.readFileSync(eyesJsonlFile, 'utf-8').trim().split('\n').filter(Boolean);
      const eyesSummary = { passed: 0, failed: 0, unresolved: 0, urls: [], tests: [] };

      for (const line of lines) {
        const detail = JSON.parse(line);
        eyesSummary.tests.push(detail);
        if (detail.status === 'Passed')      eyesSummary.passed++;
        else if (detail.status === 'Failed') eyesSummary.failed++;
        else                                 eyesSummary.unresolved++;
        if (detail.url) eyesSummary.urls.push(detail.url);
      }

      if (eyesSummary.tests.length > 0) {
        console.log('\n  ── Applitools Visual Tests ────────────────────');
        console.log(`    ✅ Passed     : ${eyesSummary.passed}`);
        console.log(`    ❌ Failed     : ${eyesSummary.failed}`);
        console.log(`    ❓ Unresolved : ${eyesSummary.unresolved}`);
        if (eyesSummary.urls.length > 0) {
          console.log(`    🔗 Dashboard  : ${eyesSummary.urls[0]}`);
        }

        // Persist consolidated results for Applitools report generation
        const eyesResultsFile = path.resolve(__dirname, '..', 'applitools-results.json');
        fs.writeFileSync(eyesResultsFile, JSON.stringify(eyesSummary, null, 2), 'utf-8');
        console.log(`    📄 Results    : applitools-results.json`);
      }

      // Clean up temporary JSONL file
      fs.unlinkSync(eyesJsonlFile);
    }
  } catch (err) {
    console.warn(`  ⚠ Applitools results: ${err.message}`);
  }

  console.log('\n' + '─'.repeat(52) + '\n');
};
