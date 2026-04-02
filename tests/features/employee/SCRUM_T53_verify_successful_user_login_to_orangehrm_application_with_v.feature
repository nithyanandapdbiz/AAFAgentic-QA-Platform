# =============================================================================
# Zephyr Test Case : SCRUM-T53
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify successful User Login to OrangeHRM Application with valid inputs
# Design Technique : Equivalence Partitioning (EP) — Valid Partition
# Labels           : happy-path, smoke, ep-valid, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T53 User Login to OrangeHRM Application — Verify successful User Login to OrangeHRM Application with valid inputs

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T53 @happy-path @smoke @ep-valid
  Scenario: Verify successful User Login to OrangeHRM Application with valid inputs
    Given [Pre-condition] User is logged out. Browser is open at the application URL.
    Given Navigate to the application login page and log in with valid admin credentials (Username: Admin, Password: admin123).
    Given Navigate to the User Login to OrangeHRM Application page or form via the main navigation menu.
    Then Verify the form/page loads completely with all fields visible.
    When Fill in First Name field with valid test data: "AutoTest" (alphabetic, within 1–50 char limit).
    When Fill in Last Name field with valid test data: "Employee" (alphabetic, within 1–50 char limit).
    When Fill in any other required fields with valid test data as per test data table.
    When Click the Save / Submit button to trigger the action.
    And Wait for the system response (success message or redirect).
    Then Verify a success confirmation message is displayed (e.g. "Successfully Saved").
    Then Verify the system redirects to the expected page (e.g. employee detail view).
    Then [Post-condition] Verify the new record appears in the list/search results.
