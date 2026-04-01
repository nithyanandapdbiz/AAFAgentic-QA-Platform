'use strict';
/**
 * applitools.config.js
 *
 * Applitools Eyes configuration for the OrangeHRM QA platform.
 * Read by tests/helpers/eyes.helper.js at runtime.
 *
 * Required env var:
 *   APPLITOOLS_API_KEY   — your Applitools API key
 *                          (Dashboard → Account → My API Key)
 *
 * Optional env vars:
 *   APPLITOOLS_APP_NAME    (default: "OrangeHRM")
 *   APPLITOOLS_BATCH_NAME  (default: "OrangeHRM QA Suite")
 *   APPLITOOLS_SERVER_URL  (default: Applitools public cloud)
 *   APPLITOOLS_MATCH_LEVEL (default: "Strict")  — Strict | Content | Layout | Exact
 */

module.exports = {
  apiKey:     process.env.APPLITOOLS_API_KEY,
  appName:    process.env.APPLITOOLS_APP_NAME    || 'OrangeHRM',
  batchName:  process.env.APPLITOOLS_BATCH_NAME  || 'OrangeHRM QA Suite',
  serverUrl:  process.env.APPLITOOLS_SERVER_URL  || 'https://eyesapi.applitools.com',
  matchLevel: process.env.APPLITOOLS_MATCH_LEVEL || 'Strict',

  // Viewport used for visual comparisons (must match Playwright's viewport)
  viewportSize: { width: 1280, height: 720 },
};
