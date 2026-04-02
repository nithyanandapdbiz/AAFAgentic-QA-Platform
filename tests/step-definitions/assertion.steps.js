'use strict';
/**
 * assertion.steps.js
 *
 * Then-step definitions — all assertions and verification checks.
 */

const { createBdd } = require('playwright-bdd');
const { test, expect } = require('../fixtures/pom.fixture');

const { Then } = createBdd(test);

// ─── URL / redirect assertions ────────────────────────────────────────────────

Then('I should be redirected to the Personal Details page', async ({ page }) => {
  await expect(page).toHaveURL(/viewPersonalDetails/, { timeout: 15000 });
});

Then('I should not be on the Personal Details page', async ({ page }) => {
  expect(page.url()).not.toMatch(/viewPersonalDetails/);
});

Then('I should be redirected to the Login page', async ({ page }) => {
  await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  await expect(page.locator('input[name="username"]')).toBeVisible();
});

Then('the page URL should not contain an error', async ({ page }) => {
  await page.waitForLoadState('networkidle');
  expect(page.url()).not.toMatch(/error|exception/i);
});

// ─── Form / element assertions ────────────────────────────────────────────────

Then('validation error messages should be visible', async ({ addEmployeePage }) => {
  await expect(addEmployeePage.validationErrors.first()).toBeVisible({ timeout: 5000 });
  const count = await addEmployeePage.validationErrors.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

Then('the employee profile header should be visible', async ({ page }) => {
  await expect(page.locator('h6.oxd-text').first()).toBeVisible();
});

Then('the {string} field should display {string}',
  async ({ page }, fieldName, expectedValue) => {
    await expect(page.locator(`input[name="${fieldName}"]`))
      .toHaveValue(expectedValue, { timeout: 8000 });
  }
);

// ─── Page access assertions ───────────────────────────────────────────────────

Then('the Employee List should be accessible', async ({ page }) => {
  await expect(page).toHaveURL(/viewEmployeeList/, { timeout: 15000 });
  await expect(page.locator('.oxd-table')).toBeVisible();
});

Then('the Add Employee form should be accessible', async ({ page, addEmployeePage }) => {
  await expect(page).toHaveURL(/addEmployee/);
  await expect(addEmployeePage.firstNameInput).toBeVisible();
});
