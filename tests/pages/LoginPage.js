'use strict';
/**
 * LoginPage — OrangeHRM Login
 * URL: /web/index.php/auth/login
 */
class LoginPage {
  constructor(page) {
    this.page = page;

    // ── Locators ───────────────────────────────────────────────
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton   = page.locator('button[type="submit"]');
    this.errorAlert    = page.locator('.oxd-alert--error');
  }

  /** Navigate to the login page. */
  async goto() {
    await this.page.goto('/web/index.php/auth/login');
    await this.page.waitForSelector('input[name="username"]', { timeout: 15000 });
  }

  /**
   * Log in and wait for the dashboard.
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    await this.goto();
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL('**/dashboard**', { timeout: 15000 });
  }

  /** Returns the visible error message text, or null. */
  async getErrorMessage() {
    const visible = await this.errorAlert.isVisible().catch(() => false);
    return visible ? this.errorAlert.textContent() : null;
  }
}

module.exports = { LoginPage };
