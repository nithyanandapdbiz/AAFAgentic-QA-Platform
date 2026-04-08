'use strict';
/**
 * eyes.fixture.js  —  Playwright fixture for Applitools Eyes
 * ─────────────────────────────────────────────────────────────────────────────
 * Extends the standard Playwright `test` object with an `eyes` fixture that
 * automatically:
 *   1. Opens an Applitools Eyes session in beforeEach (via fixture setup)
 *   2. Passes the EyesHelper instance to the test via `{ eyes }` destructuring
 *   3. After the test (afterEach via fixture teardown):
 *        • Closes the session (test passed)  → records visual baseline/diff
 *        • Aborts via abortIfNotClosed() (test failed)  → baseline NOT affected
 *        • Attaches the Applitools dashboard URL to testInfo for reports
 *
 * When APPLITOOLS_API_KEY is not set, EyesHelper is disabled — every method
 * is a no-op, tests run exactly as before.
 *
 * Usage in spec files:
 *   const { test, expect } = require('../fixtures/eyes.fixture');
 *
 *   test('my test', async ({ page, eyes }, testInfo) => {
 *     const sh = new ScreenshotHelper(page, testInfo, eyes);
 *     await sh.step('Step name', async () => { ... });
 *     await eyes.checkElement(page.locator('.header'), 'Header');
 *     await eyes.checkIgnoring('Full Page', ['.timestamp', '.ad-banner']);
 *   });
 */

const { test: base } = require('@playwright/test');
const { EyesHelper } = require('../helpers/eyes.helper');

const test = base.extend({
  /**
   * `eyes` fixture — EyesHelper instance with auto open/close lifecycle.
   * Scoped to each test (default scope).
   *
   * Lifecycle:
   *   beforeEach → eyes.open(page, testName)
   *   test body  → await use(eyes)
   *   afterEach  → eyes.close() on pass, eyes.abort() on fail
   */
  eyes: async ({ page }, use, testInfo) => {
    const eyes = new EyesHelper();

    // ── beforeEach: Open Eyes session (no-op if API key is absent) ──
    await eyes.open(page, testInfo.title);

    // Hand control to the test body
    await use(eyes);

    // ── afterEach: Close or abort based on test outcome ──
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
      // Abort on failure — uses abortIfNotClosed() for safety
      await eyes.abort();
    }
  },
});

// Re-export `expect` unchanged so callers don't need to import from two places
const { expect } = base;

module.exports = { test, expect };
