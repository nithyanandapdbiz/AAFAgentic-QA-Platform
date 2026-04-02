'use strict';
/**
 * auth.steps.js
 *
 * Step definitions for authentication and session management.
 * Covers: login, cookie clearing, unauthenticated navigation.
 */

const { createBdd } = require('playwright-bdd');
const { test }      = require('../fixtures/pom.fixture');

const { Given, When } = createBdd(test);

// ─── Pre-conditions ──────────────────────────────────────────────────────────

Given('the browser is open at the OrangeHRM application', async ({ page }) => {
  // Clear cookies before each scenario to ensure a clean session state
  await page.context().clearCookies();
});

// ─── Login ───────────────────────────────────────────────────────────────────

When('I log in as HR Admin', async ({ loginPage }) => {
  await loginPage.login('Admin', 'admin123');
});

// ─── Session management ──────────────────────────────────────────────────────

When('I clear my session cookies', async ({ page }) => {
  await page.context().clearCookies();
});
