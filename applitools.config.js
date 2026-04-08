'use strict';
/**
 * applitools.config.js — Applitools Eyes Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised configuration for Applitools visual testing.
 * Read by tests/helpers/eyes.helper.js at runtime.
 *
 * Required env var:
 *   APPLITOOLS_API_KEY         — your Applitools API key
 *                                (Dashboard → Account → My API Key)
 *
 * Optional env vars:
 *   APPLITOOLS_APP_NAME        (default: "OrangeHRM")
 *   APPLITOOLS_BATCH_NAME      (default: "OrangeHRM QA Suite")
 *   APPLITOOLS_BATCH_ID        (default: auto) — set in CI for cross-machine batching
 *   APPLITOOLS_SERVER_URL      (default: Applitools public cloud)
 *   APPLITOOLS_MATCH_LEVEL     (default: "Strict") — Strict | Content | Layout | Exact
 *   USE_ULTRAFAST_GRID         (default: false) — set "true" to use Ultrafast Grid
 *   APPLITOOLS_CONCURRENCY     (default: 5) — parallel rendering slots for UFG
 */

module.exports = {
  // ── Core ────────────────────────────────────────────────────────────────
  apiKey:     process.env.APPLITOOLS_API_KEY,
  appName:    process.env.APPLITOOLS_APP_NAME    || 'OrangeHRM',
  batchName:  process.env.APPLITOOLS_BATCH_NAME  || 'OrangeHRM QA Suite',
  serverUrl:  process.env.APPLITOOLS_SERVER_URL  || 'https://eyesapi.applitools.com',
  matchLevel: process.env.APPLITOOLS_MATCH_LEVEL || 'Strict',

  // Viewport used for visual comparisons (must match Playwright's viewport)
  viewportSize: { width: 1280, height: 720 },

  // ── Ultrafast Grid (cross-browser / responsive testing) ─────────────────
  // Set USE_ULTRAFAST_GRID=true to enable parallel rendering across browsers/devices
  useUltrafastGrid: process.env.USE_ULTRAFAST_GRID === 'true',
  concurrency:      parseInt(process.env.APPLITOOLS_CONCURRENCY || '5', 10),

  // Browser/device matrix rendered on the Ultrafast Grid
  // Each entry creates a separate visual baseline
  browsersConfig: [
    // Desktop browsers
    { name: 'CHROME',  width: 1280, height: 720 },
    { name: 'FIREFOX', width: 1280, height: 720 },
    { name: 'SAFARI',  width: 1280, height: 720 },
    { name: 'EDGE_CHROMIUM', width: 1280, height: 720 },

    // Mobile device emulation
    { deviceName: 'iPhone_14', screenOrientation: 'Portrait' },
    { deviceName: 'Pixel_7',   screenOrientation: 'Portrait' },
  ],

  // ── Retry / resilience ──────────────────────────────────────────────────
  // Number of retry attempts for transient checkpoint failures
  checkpointRetries: 2,
};
