'use strict';
const { test } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

// Screenshots are saved to: test-results/screenshots/<test-slug>/<step>.png
const SCREENSHOTS_ROOT = path.resolve(__dirname, '..', '..', 'test-results', 'screenshots');

/**
 * ScreenshotHelper
 *
 * Provides two mechanisms for capturing screenshots during Playwright tests:
 *
 *  1. sh.step('Label', async () => { ... })
 *     Wraps actions inside a named Playwright test.step() block.
 *     A full-page screenshot is taken AFTER the step's actions complete.
 *     Screenshots are saved to:
 *       test-results/screenshots/<test-slug>/step-01-label.png
 *
 *  2. sh.capture('label')
 *     Takes a standalone screenshot at any point — not inside a step block.
 *
 * Screenshots are read by scripts/generate-report.js to build the
 * custom HTML report at custom-report/index.html.
 *
 * Usage inside a spec file:
 *
 *   test('my test', async ({ page }, testInfo) => {
 *     const sh = new ScreenshotHelper(page, testInfo);
 *
 *     await sh.step('Open login page', async () => {
 *       await page.goto('/web/index.php/auth/login');
 *     });
 *   });
 */
class ScreenshotHelper {
  /**
   * @param {import('@playwright/test').Page}     page
   * @param {import('@playwright/test').TestInfo} testInfo
   * @param {import('./eyes.helper').EyesHelper}  [eyes]   Optional Applitools Eyes instance.
   *        When provided (and APPLITOOLS_API_KEY is set), a full-window visual
   *        checkpoint is taken after each step and capture() call.
   */
  constructor(page, testInfo, eyes = null) {
    this.page     = page;
    this.testInfo = testInfo;
    this._counter = 0;
    this._eyes    = eyes;   // EyesHelper — null means visual AI is disabled

    // Unique directory per test — derived from the test title
    const title = (testInfo.title || 'test')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
      .toLowerCase();
    this._dir = path.join(SCREENSHOTS_ROOT, title);
    fs.mkdirSync(this._dir, { recursive: true });
  }

  /**
   * Run `fn` inside a named test.step() and capture a full-page screenshot
   * after the step completes.
   *
   * @param {string}   label  Human-readable step label shown in the report
   * @param {Function} fn     Async callback containing the step's actions
   */
  async step(label, fn) {
    this._counter++;
    const num = String(this._counter).padStart(2, '0');
    return test.step(`${num}. ${label}`, async () => {
      await fn();
      await this._capture(`step-${num}-${label}`);
      // Visual AI checkpoint — no-op when eyes is null or API key is absent
      if (this._eyes) await this._eyes.check(`${num}. ${label}`);
    });
  }

  /**
   * Capture a screenshot at a specific point outside a step wrapper.
   *
   * @param {string} label  Descriptive label used as the file name
   */
  async capture(label) {
    await this._capture(label);
    if (this._eyes) await this._eyes.check(label);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  async _capture(label) {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70);
    const filePath = path.join(this._dir, `${slug}.png`);
    try {
      const buffer = await this.page.screenshot({ fullPage: true });
      fs.writeFileSync(filePath, buffer);
    } catch {
      // Silently skip if the page is in a closed or crashed state
    }
  }
}

module.exports = { ScreenshotHelper };
