'use strict';
/**
 * employee.steps.js
 *
 * Step definitions for Employee Creation form actions.
 * Covers: navigation, form filling, submission, cancellation, search.
 */

const { createBdd } = require('playwright-bdd');
const { test }      = require('../fixtures/pom.fixture');

const { When } = createBdd(test);

// ─── Navigation ──────────────────────────────────────────────────────────────

When('I navigate to the Add Employee form', async ({ addEmployeePage }) => {
  await addEmployeePage.navigate();
});

When('I navigate to the Employee List page', async ({ employeeListPage }) => {
  await employeeListPage.navigate();
});

When('I navigate to the Add Employee URL directly', async ({ page }) => {
  await page.goto('/web/index.php/pim/addEmployee');
});

// ─── Form filling ─────────────────────────────────────────────────────────────

When('I fill in first name {string} and last name {string}',
  async ({ addEmployeePage }, firstName, lastName) => {
    await addEmployeePage.fillEmployee({ firstName, lastName });
  }
);

When('I fill in first name with {int} characters and last name with {int} characters',
  async ({ addEmployeePage }, fnLen, lnLen) => {
    await addEmployeePage.fillEmployee({
      firstName: 'A'.repeat(fnLen),
      lastName:  'B'.repeat(lnLen),
    });
  }
);

When('I fill in first name {string} and last name with a unique timestamp suffix',
  async ({ addEmployeePage, uniqueSuffix }, firstName) => {
    await addEmployeePage.fillEmployee({
      firstName,
      lastName: `DC${uniqueSuffix}`,
    });
  }
);

When('I set the Employee ID to {string}', async ({ addEmployeePage }, id) => {
  await addEmployeePage.setEmployeeId(id);
});

When('I set the Employee ID with a unique timestamp suffix',
  async ({ addEmployeePage, uniqueSuffix }) => {
    await addEmployeePage.setEmployeeId(`DP${uniqueSuffix}`);
  }
);

When('I clear all required name fields', async ({ addEmployeePage }) => {
  await addEmployeePage.firstNameInput.clear();
  await addEmployeePage.lastNameInput.clear();
});

// ─── Submission / actions ─────────────────────────────────────────────────────

When('I submit the employee form', async ({ addEmployeePage }) => {
  await addEmployeePage.save();
});

When('I click Cancel', async ({ addEmployeePage, page }) => {
  await addEmployeePage.cancel();
  await page.waitForLoadState('networkidle');
});

// ─── Search ───────────────────────────────────────────────────────────────────

When('I search for employee {string} in the Employee List',
  async ({ employeeListPage }, name) => {
    await employeeListPage.searchEmployee(name);
    await employeeListPage.page.waitForLoadState('networkidle');
  }
);
