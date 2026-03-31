const { defineConfig } = require('@playwright/test');

// PW_HEADLESS=true  → headless (CI mode)
// PW_HEADLESS=false or unset → headed UI browser (default for QA platform)
const headless = process.env.PW_HEADLESS === 'true';

module.exports = defineConfig({
  testDir: './tests/specs',
  timeout: 90000,
  retries: 1,
  reporter: [
    ['list'],
    ['json',  { outputFile: 'test-results.json' }],
    ['html',  { outputFolder: 'playwright-report', open: 'never' }]
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

