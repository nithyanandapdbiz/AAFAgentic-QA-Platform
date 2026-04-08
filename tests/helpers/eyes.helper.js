'use strict';
/**
 * eyes.helper.js  —  Applitools Eyes Visual Testing Helper
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade wrapper for @applitools/eyes-playwright that provides:
 *
 *  ● Full-page visual checkpoints           → check(tag)
 *  ● Element-level visual validation         → checkElement(locator, tag)
 *  ● Ignore dynamic regions (ads, timestamps)→ checkIgnoring(tag, selectors[])
 *  ● Layout match for responsive pages       → checkLayout(tag)
 *  ● Ultrafast Grid (cross-browser/device)   → when USE_ULTRAFAST_GRID=true
 *  ● Thread-safe parallel execution          → per-instance Eyes, shared runner
 *  ● Retry mechanism for transient failures  → configurable max retries
 *  ● abortIfNotClosed() safety net           → abort()
 *  ● CI/CD batch ID support                  → APPLITOOLS_BATCH_ID env var
 *  ● Runner-level result summary             → EyesHelper.getRunnerResults()
 *
 * Separation of concerns:
 *   No Eyes logic leaks into test files — tests only call sh.step() which
 *   delegates to this helper via the ScreenshotHelper bridge.
 *
 * Used by:
 *   tests/fixtures/base.fixture.js   (lifecycle: open → use → close/abort)
 *   tests/helpers/screenshot.helper.js  (per-step checkpoint via check())
 */

const {
  Eyes,
  Target,
  BatchInfo,
  Configuration,
  ClassicRunner,
  VisualGridRunner,
  BrowserType,
  DeviceName,
  ScreenOrientation,
  MatchLevel,
  Region,
} = require('@applitools/eyes-playwright');

const applitoolsConfig = require('../../applitools.config');

// ── Shared runner + batch — one singleton per process (thread-safe) ──────────
let _runner = null;
let _batch  = null;

/**
 * Returns the shared runner instance.
 * Uses VisualGridRunner (Ultrafast Grid) when configured, else ClassicRunner.
 */
function getRunner() {
  if (!_runner) {
    const useUFG = applitoolsConfig.useUltrafastGrid;
    if (useUFG) {
      const concurrency = applitoolsConfig.concurrency || 5;
      _runner = new VisualGridRunner({ testConcurrency: concurrency });
      console.log(`  [Applitools] Ultrafast Grid runner (concurrency: ${concurrency})`);
    } else {
      _runner = new ClassicRunner();
      console.log('  [Applitools] Classic runner');
    }
  }
  return _runner;
}

/**
 * Returns the shared BatchInfo.
 * Reuses APPLITOOLS_BATCH_ID from CI when present for cross-machine grouping.
 */
function getBatch() {
  if (!_batch) {
    _batch = new BatchInfo(applitoolsConfig.batchName);
    // CI/CD batch ID — ensures CI pipeline runs group into one batch
    if (process.env.APPLITOOLS_BATCH_ID) {
      _batch.setId(process.env.APPLITOOLS_BATCH_ID);
    }
  }
  return _batch;
}

// ── EyesHelper ────────────────────────────────────────────────────────────────
class EyesHelper {
  /**
   * @param {boolean} [enabled]  Override; defaults to !!APPLITOOLS_API_KEY
   */
  constructor(enabled) {
    this._enabled = (enabled !== undefined)
      ? enabled
      : !!process.env.APPLITOOLS_API_KEY;
    this._eyes      = null;
    this._open      = false;
    this._url       = null;   // Applitools dashboard URL (set after close)
    this._status    = null;   // 'Passed' | 'Failed' | 'Unresolved'
    this._maxRetries = applitoolsConfig.checkpointRetries || 2;
  }

  /** True when Eyes is configured and sessions will be created. */
  get enabled() { return this._enabled; }

  /** Applitools dashboard URL — available after close(). */
  get url() { return this._url; }

  /** Visual test status — available after close(). */
  get status() { return this._status; }

  /**
   * Open an Eyes session.
   * @param {import('@playwright/test').Page} page
   * @param {string} testName   — typically testInfo.title
   */
  async open(page, testName) {
    if (!this._enabled) return;

    const config = new Configuration();
    config.setApiKey(process.env.APPLITOOLS_API_KEY);
    config.setAppName(applitoolsConfig.appName);
    config.setBatch(getBatch());
    if (applitoolsConfig.serverUrl) config.setServerUrl(applitoolsConfig.serverUrl);

    // Match level
    const levelMap = {
      Strict:  MatchLevel.Strict,
      Content: MatchLevel.Content,
      Layout:  MatchLevel.Layout,
      Exact:   MatchLevel.Exact,
    };
    config.setMatchLevel(levelMap[applitoolsConfig.matchLevel] ?? MatchLevel.Strict);

    // ── Ultrafast Grid — cross-browser / device matrix ────────────────
    if (applitoolsConfig.useUltrafastGrid) {
      for (const b of (applitoolsConfig.browsersConfig || [])) {
        if (b.deviceName) {
          // Mobile device emulation
          config.addBrowser({
            deviceName: DeviceName[b.deviceName] || b.deviceName,
            screenOrientation: ScreenOrientation[b.screenOrientation || 'Portrait'],
          });
        } else {
          // Desktop browser
          config.addBrowser(
            b.width  || 1280,
            b.height || 720,
            BrowserType[b.name] || BrowserType.CHROME
          );
        }
      }
    }

    this._eyes = new Eyes(getRunner());
    this._eyes.setConfiguration(config);

    try {
      await this._eyes.open(
        page,
        applitoolsConfig.appName,
        testName,
        applitoolsConfig.viewportSize
      );
      this._open = true;
    } catch (err) {
      console.warn(`[Applitools] open() failed: ${err.message}`);
      this._eyes = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Visual Checkpoints
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Full-page visual checkpoint.
   * @param {string} tag   — step label shown in the Applitools dashboard
   */
  async check(tag) {
    if (!this._eyes || !this._open) return;
    await this._retry(tag, () =>
      this._eyes.check(tag, Target.window().fully())
    );
  }

  /**
   * Element-level visual validation — captures only a specific element.
   * @param {import('@playwright/test').Locator} locator  — Playwright locator
   * @param {string} tag  — checkpoint label
   *
   * @example
   *   await eyes.checkElement(page.locator('.dashboard-header'), 'Dashboard Header');
   */
  async checkElement(locator, tag) {
    if (!this._eyes || !this._open) return;
    // Resolve the element handle for Eyes
    const element = await locator.elementHandle().catch(() => null);
    if (!element) {
      console.warn(`[Applitools] checkElement('${tag}'): element not found — skipping`);
      return;
    }
    await this._retry(tag, () =>
      this._eyes.check(tag, Target.region(element).fully())
    );
  }

  /**
   * Full-page checkpoint that ignores dynamic regions (ads, timestamps, etc.).
   * @param {string}   tag        — checkpoint label
   * @param {string[]} selectors  — CSS selectors of regions to ignore
   *
   * @example
   *   await eyes.checkIgnoring('Dashboard', ['.oxd-topbar-header-breadcrumb', '.oxd-text--toast']);
   */
  async checkIgnoring(tag, selectors = []) {
    if (!this._eyes || !this._open) return;
    let target = Target.window().fully();
    for (const sel of selectors) {
      target = target.ignoreRegions(sel);
    }
    await this._retry(tag, () => this._eyes.check(tag, target));
  }

  /**
   * Layout-only checkpoint — ignores text/color, validates structure only.
   * Ideal for responsive pages where content changes but layout stays.
   * @param {string} tag  — checkpoint label
   */
  async checkLayout(tag) {
    if (!this._eyes || !this._open) return;
    await this._retry(tag, () =>
      this._eyes.check(tag, Target.window().fully().layout())
    );
  }

  /**
   * Close the Eyes session and collect results.
   * Call this when the test PASSED.
   * @returns {string|null} Applitools dashboard URL
   */
  async close() {
    if (!this._eyes || !this._open) return null;
    try {
      const results = await this._eyes.close(false); // false = don't throw on diff
      if (results) {
        this._url    = results.getUrl   ? results.getUrl()    : null;
        this._status = results.getStatus ? results.getStatus() : null;

        // Build per-test detail object for report generation
        this._lastResult = {
          name:        results.getName       ? results.getName()       : 'Unknown',
          appName:     results.getAppName    ? results.getAppName()    : '',
          status:      this._status || 'Unknown',
          url:         this._url,
          hostApp:     results.getHostApp    ? results.getHostApp()    : '',
          hostOS:      results.getHostOS     ? results.getHostOS()     : '',
          steps:       results.getSteps      ? results.getSteps()      : 0,
          matches:     results.getMatches    ? results.getMatches()    : 0,
          mismatches:  results.getMismatches ? results.getMismatches() : 0,
          missing:     results.getMissing    ? results.getMissing()    : 0,
          isNew:       results.getIsNew      ? results.getIsNew()      : false,
          startedAt:   results.getStartedAt  ? results.getStartedAt() : null,
          duration:    results.getDuration   ? results.getDuration()   : 0,
        };
      }
      return this._url;
    } catch (err) {
      console.warn(`[Applitools] close() warning: ${err.message}`);
      return null;
    } finally {
      this._open  = false;
      this._eyes  = null;
    }
  }

  /** Returns the detailed result from the last close() call, or null. */
  getLastResult() {
    return this._lastResult || null;
  }

  /**
   * Abort the Eyes session without recording results.
   * Call this when the test FAILED (so the baseline is not polluted).
   * Uses abortIfNotClosed() pattern for maximum safety.
   */
  async abort() {
    if (!this._eyes) return;
    try {
      // abortIfNotClosed() is the recommended safety-net pattern —
      // it's a no-op if the session was already closed
      if (typeof this._eyes.abortIfNotClosed === 'function') {
        await this._eyes.abortIfNotClosed();
      } else {
        await this._eyes.abort();
      }
    } catch { /* ignore */ } finally {
      this._open = false;
      this._eyes = null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Internal: retry mechanism for transient visual checkpoint failures
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Retry a visual checkpoint up to _maxRetries on transient failures.
   * Each attempt is capped at 30 seconds to prevent hangs.
   * @param {string}   tag  — checkpoint label (for logging)
   * @param {Function} fn   — async function to execute
   */
  async _retry(tag, fn) {
    const PER_ATTEMPT_TIMEOUT = 30_000; // 30 seconds max per attempt
    let lastErr;
    for (let attempt = 1; attempt <= this._maxRetries; attempt++) {
      try {
        await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Applitools check('${tag}') timed out after ${PER_ATTEMPT_TIMEOUT / 1000}s`)), PER_ATTEMPT_TIMEOUT)
          ),
        ]);
        return; // success
      } catch (err) {
        lastErr = err;
        if (attempt < this._maxRetries) {
          console.warn(`[Applitools] check('${tag}') attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
        }
      }
    }
    console.warn(`[Applitools] check('${tag}') failed after ${this._maxRetries} attempts: ${lastErr?.message}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Static: runner-level results summary (call once after all tests complete)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Collect and log all visual test results from the shared runner.
   * Call this in globalTeardown for a summary of all Applitools tests.
   *
   * @returns {{ passed: number, failed: number, unresolved: number, urls: string[], tests: Array }}
   */
  static async getRunnerResults() {
    if (!_runner) return { passed: 0, failed: 0, unresolved: 0, urls: [], tests: [] };

    try {
      const allResults = await _runner.getAllTestResults(false); // false = don't throw
      const summary = { passed: 0, failed: 0, unresolved: 0, urls: [], tests: [] };

      for (const container of allResults.getAllResults()) {
        const result = container.getTestResults();
        if (!result) continue;

        const status = result.getStatus();
        if (status === 'Passed')       summary.passed++;
        else if (status === 'Failed')  summary.failed++;
        else                           summary.unresolved++;

        const url = result.getUrl();
        if (url) summary.urls.push(url);

        // Collect per-test detail for report generation
        summary.tests.push({
          name:        result.getName       ? result.getName()       : 'Unknown',
          appName:     result.getAppName    ? result.getAppName()    : '',
          status,
          url:         url || null,
          hostApp:     result.getHostApp    ? result.getHostApp()    : '',
          hostOS:      result.getHostOS     ? result.getHostOS()     : '',
          steps:       result.getSteps      ? result.getSteps()      : 0,
          matches:     result.getMatches    ? result.getMatches()    : 0,
          mismatches:  result.getMismatches ? result.getMismatches()  : 0,
          missing:     result.getMissing    ? result.getMissing()     : 0,
          isNew:       result.getIsNew      ? result.getIsNew()      : false,
          startedAt:   result.getStartedAt  ? result.getStartedAt()  : null,
          duration:    result.getDuration   ? result.getDuration()   : 0,
        });
      }

      console.log(`\n  [Applitools] Runner Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.unresolved} unresolved`);
      return summary;
    } catch (err) {
      console.warn(`[Applitools] getRunnerResults() warning: ${err.message}`);
      return { passed: 0, failed: 0, unresolved: 0, urls: [] };
    }
  }
}

module.exports = { EyesHelper, getRunner, getBatch };
