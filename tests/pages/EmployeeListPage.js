'use strict';
/**
 * EmployeeListPage — OrangeHRM PIM → Employee List
 * URL: /web/index.php/pim/viewEmployeeList
 */
class EmployeeListPage {
  constructor(page) {
    this.page = page;

    // ── Search form ──────────────────────────────────────────
    // OrangeHRM uses an autocomplete input for the Employee Name filter.
    this.searchNameInput = page.locator(
      '.oxd-autocomplete-text-input input, [placeholder="Type for hints..."]'
    ).first();
    this.searchButton = page.locator('button[type="submit"]');

    // ── Results table ────────────────────────────────────────
    this.tableRows     = page.locator('.oxd-table-body .oxd-table-row');
    this.noRecordsText = page.locator('.oxd-text:has-text("No Records Found")');

    // ── Pagination info ──────────────────────────────────────
    this.paginationInfo = page.locator('.orangehrm-bottom-container');
  }

  // ── Actions ───────────────────────────────────────────────

  /** Navigate to the Employee List page. */
  async navigate() {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Type a name into the search field and submit.
   * Uses a slight delay to trigger autocomplete suggestions.
   * @param {string} name  Full or partial employee name
   */
  async searchEmployee(name) {
    await this.navigate();
    await this.searchNameInput.click();
    await this.searchNameInput.type(name, { delay: 80 });
    await this.page.waitForTimeout(1000); // wait for autocomplete response
    await this.searchButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Returns the number of rows currently visible in the results table. */
  async getRowCount() {
    return this.tableRows.count();
  }
}

module.exports = { EmployeeListPage };
