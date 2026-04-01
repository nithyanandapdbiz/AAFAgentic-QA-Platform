'use strict';
/**
 * eyes.fixture.js  —  Playwright fixture for Applitools Eyes
 * ─────────────────────────────────────────────────────────────────────────────
 * Extends the standard Playwright `test` object with an `eyes` fixture that
 * automatically:
 *   1. Opens an Applitools Eyes session before the test body runs
 *   2. Passes the EyesHelper instance to the test via `{ eyes }` destructuring
 *   3. After the test:
 *        • Closes the session (test passed)  → records visual baseline/diff
 *        • Aborts the session (test failed)  → baseline is NOT affected
 *        • Attaches the Applitools dashboard URL to testInfo so it appears in
 *          generate-report.js and the Playwright HTML report
 *
 * When APPLITOOLS_API_KEY is not set, EyesHelper is disabled — every method
 * is a no-op, tests run exactly as before.
 *
 * Usage in spec files:
 *   const { test, expect } = require('../fixtures/eyes.fixture');
 *
 *   test('my test', async ({ page, eyes }, testInfo) => {
 *     const sh = new ScreenshotHelper(page, testInfo, eyes);
 *     // sh.step() now also takes an Applitools checkpoint after each step
 *   });
 */

const { test: base } = require('@playwright/test');
const { EyesHelper } = require('../helpers/eyes.helper');

const test = base.extend({
  /**
   * `eyes` fixture — EyesHelper instance with auto open/close lifecycle.
   * Scoped to each test (default scope).
   */
  eyes: async ({ page }, use, testInfo) => {
    const eyes = new EyesHelper();

    // Open Eyes session (no-op if API key is absent)
    await eyes.open(page, testInfo.title);

    // Hand control to the test body
    await use(eyes);

    // ── Teardown ──────────────────────────────────────────────────────────
    const passed = testInfo.status === 'passed';

    if (passed) {
      const url = await eyes.close();
      // Attach the Applitools dashboard URL so it shows up in reports
      if (url) {
        await testInfo.attach('Applitools Results', {
          body:        url,
          contentType: 'text/plain',
        });
        const statusLabel = eyes.status ? ` (${eyes.status})` : '';
        console.log(`  [Applitools] Visual results${statusLabel}: ${url}`);
      }
    } else {
      // Abort on failure — keeps the baseline clean
      await eyes.abort();
    }
  },
});

// Re-export `expect` unchanged so callers don't need to import from two places
const { expect } = base;

module.exports = { test, expect };
