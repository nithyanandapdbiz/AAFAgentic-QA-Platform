const { defineConfig } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

// PW_HEADLESS=true  → headless (CI mode)
// PW_HEADLESS=false or unset → headed UI browser (default for QA platform)
const headless = process.env.PW_HEADLESS === 'true';

// PW_GREP=<regex>  → filter tests by title regex (avoids shell pipe-splitting on Windows)
const grepEnv = process.env.PW_GREP ? new RegExp(process.env.PW_GREP, 'i') : undefined;

// BDD mode: generate intermediate test files from .feature files
// Run: npx bddgen && npx playwright test   (or: npm run test:bdd)
// Legacy Playwright specs remain in tests/specs/ and still run with: npx playwright test
const BDD_MODE = process.env.BDD === 'true';

const bddTestDir = BDD_MODE
  ? defineBddConfig({
      features: 'tests/features/**/*.feature',
      steps: [
        'tests/step-definitions/**/*.js',
        'tests/fixtures/pom.fixture.js',
      ],
      outputDir: '.features-gen',
    })
  : undefined;

module.exports = defineConfig({
  testDir: BDD_MODE ? bddTestDir : './tests/specs',
  timeout: 90000,
  retries: 1,
  grep: grepEnv,
  reporter: [
    ['list'],
    ['json',  { outputFile: 'test-results.json' }],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: true }]
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

