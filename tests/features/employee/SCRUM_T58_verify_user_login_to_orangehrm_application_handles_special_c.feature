# =============================================================================
# Zephyr Test Case : SCRUM-T58
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify User Login to OrangeHRM Application handles special characters and unicode
# Design Technique : Error Guessing (EG) — Special character and encoding edge cases
# Labels           : edge-case, special-characters, unicode, error-guessing, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T58 User Login to OrangeHRM Application — Verify User Login to OrangeHRM Application handles special characters and unicode

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T58 @edge-case @special-characters @unicode @error-guessing
  Scenario: Verify User Login to OrangeHRM Application handles special characters and unicode
    Given [Pre-condition] User is logged in as Admin. Navigate to User Login to OrangeHRM Application form.
    Then Enter First Name: "José" (unicode accented character). Submit and verify acceptance and correct storage/display.
    Then Navigate back. Enter First Name: "O'Brien" (apostrophe). Submit and verify no SQL error occurs and data is stored correctly.
    Then Navigate back. Enter Last Name: "Müller" (umlaut). Submit and verify the umlaut is preserved in the saved record.
    When Navigate back. Enter First Name: "王" (CJK character). Submit and observe system handling (accept or graceful reject).
    Then For any accepted values: navigate to the employee profile and verify the displayed name matches exactly what was entered.
    Then Verify no JavaScript errors, 500 errors, or database exceptions occur at any step.
