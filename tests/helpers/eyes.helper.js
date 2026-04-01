'use strict';
/**
 * eyes.helper.js  —  Applitools Eyes wrapper for the QA Platform
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the @applitools/eyes-playwright SDK in a thin helper that:
 *   • Opens an Eyes session when the test starts
 *   • Takes a full-window visual checkpoint after each ScreenshotHelper step
 *   • Closes (or aborts) the session cleanly after the test
 *   • Is silently disabled when APPLITOOLS_API_KEY is not set — zero impact on
 *     runs that don't need visual AI testing
 *
 * Used by:
 *   tests/fixtures/eyes.fixture.js  (lifecycle management)
 *   tests/helpers/screenshot.helper.js  (per-step checkpoint)
 */

const {
  Eyes,
  Target,
  BatchInfo,
  Configuration,
  ClassicRunner,
  MatchLevel,
} = require('@applitools/eyes-playwright');

const applitoolsConfig = require('../../applitools.config');

// ── Shared runner + batch — one instance per process ─────────────────────────
// ClassicRunner serialises results; batch groups all tests from one run.
let _runner = null;
let _batch  = null;

function getRunner() {
  if (!_runner) _runner = new ClassicRunner();
  return _runner;
}

function getBatch() {
  if (!_batch) {
    _batch = new BatchInfo(applitoolsConfig.batchName);
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
    this._eyes  = null;
    this._open  = false;
    this._url   = null;   // Applitools dashboard URL (set after close)
    this._status = null;  // 'Passed' | 'Failed' | 'Unresolved'
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

    // Map string match level to enum
    const levelMap = {
      Strict:  MatchLevel.Strict,
      Content: MatchLevel.Content,
      Layout:  MatchLevel.Layout,
      Exact:   MatchLevel.Exact,
    };
    config.setMatchLevel(levelMap[applitoolsConfig.matchLevel] ?? MatchLevel.Strict);

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

  /**
   * Take a full-window visual checkpoint.
   * @param {string} tag   — step label shown in the Applitools dashboard
   */
  async check(tag) {
    if (!this._eyes || !this._open) return;
    try {
      await this._eyes.check(tag, Target.window().fully());
    } catch (err) {
      console.warn(`[Applitools] check('${tag}') warning: ${err.message}`);
    }
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

  /**
   * Abort the Eyes session without recording results.
   * Call this when the test FAILED (so the baseline is not polluted).
   */
  async abort() {
    if (!this._eyes) return;
    try {
      await this._eyes.abort();
    } catch { /* ignore */ } finally {
      this._open = false;
      this._eyes = null;
    }
  }
}

module.exports = { EyesHelper, getRunner, getBatch };
