'use strict';
/**
 * AddEmployeePage — OrangeHRM PIM → Add Employee
 * URL: /web/index.php/pim/addEmployee
 */
class AddEmployeePage {
  constructor(page) {
    this.page = page;

    // ── Name fields ──────────────────────────────────────────
    this.firstNameInput  = page.locator('input[name="firstName"]');
    this.middleNameInput = page.locator('input[name="middleName"]');
    this.lastNameInput   = page.locator('input[name="lastName"]');

    // ── Employee ID ─────────────────────────────────────────
    // OrangeHRM renders an auto-generated Employee Id input without a 'name'
    // attribute; it is the sole input inside the row labelled "Employee Id".
    this.employeeIdInput = page
      .locator('.oxd-input-group')
      .filter({ has: page.locator('label:has-text("Employee Id")') })
      .locator('input.oxd-input');

    // ── Buttons ──────────────────────────────────────────────
    this.saveButton   = page.locator('button[type="submit"]');
    this.cancelButton = page.locator('button.oxd-button--ghost');

    // ── Feedback ─────────────────────────────────────────────
    // OrangeHRM shows inline error spans on failed validation
    this.validationErrors = page.locator('.oxd-input-field-error-message');
  }

  // ── Actions ───────────────────────────────────────────────

  /** Navigate to the Add Employee form. */
  async navigate() {
    await this.page.goto('/web/index.php/pim/addEmployee');
    await this.page.waitForSelector('input[name="firstName"]', { timeout: 15000 });
  }

  /**
   * Fill the employee name form.
   * @param {object} opts
   * @param {string} opts.firstName
   * @param {string} [opts.middleName]
   * @param {string} opts.lastName
   */
  async fillEmployee({ firstName, middleName = '', lastName }) {
    await this.firstNameInput.fill(firstName);
    if (middleName) await this.middleNameInput.fill(middleName);
    await this.lastNameInput.fill(lastName);
  }

  /**
   * Overwrite the auto-generated Employee ID with a specific value.
   * @param {string} id
   */
  async setEmployeeId(id) {
    await this.employeeIdInput.waitFor({ state: 'visible', timeout: 5000 });
    await this.employeeIdInput.fill('');
    await this.employeeIdInput.fill(id);
  }

  /** Click the Save button. */
  async save() {
    await this.saveButton.click();
  }

  /**
   * Click Cancel if it exists; otherwise navigate away to the Employee List.
   */
  async cancel() {
    const visible = await this.cancelButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (visible) {
      await this.cancelButton.click();
    } else {
      await this.page.goto('/web/index.php/pim/viewEmployeeList');
    }
  }
}

module.exports = { AddEmployeePage };
