require('dotenv').config();
const { defineConfig } = require('@playwright/test');

// PW_HEADLESS=true  → headless (CI mode)
// PW_HEADLESS=false or unset → headed UI browser (default for QA platform)
const headless = process.env.PW_HEADLESS === 'true';

// PW_GREP=<regex>  → filter tests by title regex (avoids shell pipe-splitting on Windows)
const grepEnv = process.env.PW_GREP ? new RegExp(process.env.PW_GREP, 'i') : undefined;

module.exports = defineConfig({
  globalSetup:    './tests/global-setup.js',
  globalTeardown: './tests/global-teardown.js',
  testDir: './tests/specs',
  timeout: 90000,
  retries: 1,
  workers: 1,
  grep: grepEnv,
  reporter: [
    ['list'],
    ['json',  { outputFile: 'test-results.json' }],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    // IMPORTANT: allure-playwright v3 uses 'resultsDir' (not 'outputFolder' from v2).
    // If you upgrade allure-playwright, verify the option name hasn't changed.
    // Symptoms of a mismatch: allure-results/ stays empty after a test run.
    ['allure-playwright', { resultsDir: 'allure-results', detail: true }]
  ],
  use: {
    baseURL:    'https://opensource-demo.orangehrmlive.com',
    headless,
    screenshot: 'on',
    video:      'retain-on-failure',
    trace:      'retain-on-failure',
    launchOptions: {
      slowMo: headless ? 0 : 100   // slight slow-mo in headed mode for visibility
    }
  }
});

