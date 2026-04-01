'use strict';
/**
 * generate-allure-report.js
 *
 * Generates an Allure HTML report from the allure-results/ folder produced
 * by allure-playwright during the test run.
 *
 * Requires:   allure-commandline  (installed as devDependency)
 *
 * Usage:
 *   node scripts/generate-allure-report.js
 *
 * Output:
 *   allure-report/index.html   ← open this in a browser
 */

const { spawnSync } = require('child_process');
const path          = require('path');
const fs            = require('fs');

const ROOT         = path.resolve(__dirname, '..');
const RESULTS_DIR  = path.join(ROOT, 'allure-results');
const REPORT_DIR   = path.join(ROOT, 'allure-report');
const ALLURE_BIN   = path.join(ROOT, 'node_modules', '.bin',
                               process.platform === 'win32' ? 'allure.cmd' : 'allure');

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   Allure Report Generator                        ║');
console.log('╚══════════════════════════════════════════════════╝\n');

if (!fs.existsSync(RESULTS_DIR)) {
  console.warn(`  WARNING: allure-results/ not found at ${RESULTS_DIR}`);
  console.warn('  Run Playwright tests first — they generate allure-results/ automatically.\n');
  process.exit(0);   // soft exit — don't break the pipeline
}

const resultCount = fs.readdirSync(RESULTS_DIR).length;
console.log(`  allure-results/ contains ${resultCount} file(s)`);
console.log(`  Generating report → allure-report/\n`);

const result = spawnSync(
  ALLURE_BIN,
  ['generate', RESULTS_DIR, '--output', REPORT_DIR, '--clean'],
  { stdio: 'inherit', shell: process.platform === 'win32' }
);

if (result.status !== 0) {
  console.error(`\n  ERROR: allure generate exited with code ${result.status}`);
  if (result.error) console.error('  ', result.error.message);
  process.exit(result.status || 1);
}

console.log('\n  ✓ Allure report generated: allure-report/index.html');
console.log('  Open: allure-report/index.html\n');
