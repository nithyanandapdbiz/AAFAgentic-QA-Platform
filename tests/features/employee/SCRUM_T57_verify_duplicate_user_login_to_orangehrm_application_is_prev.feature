# =============================================================================
# Zephyr Test Case : SCRUM-T57
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify duplicate User Login to OrangeHRM Application is prevented
# Design Technique : Error Guessing (EG) — Duplicate entry scenario
# Labels           : negative, duplicate, validation, error-guessing, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T57 User Login to OrangeHRM Application — Verify duplicate User Login to OrangeHRM Application is prevented

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T57 @negative @duplicate @validation @error-guessing
  Scenario: Verify duplicate User Login to OrangeHRM Application is prevented
    Given [Pre-condition] User is logged in as Admin.
    When Perform a successful User Login to OrangeHRM Application: Enter First Name "DupeTest", Last Name "DupeUser", save the record.
    And Note the generated employee ID or unique identifier: "DUP001".
    Given Navigate back to the User Login to OrangeHRM Application form.
    When Attempt to create a second record with the exact same unique identifier "DUP001".
    When Click Save / Submit.
    When Observe the system response for the duplicate attempt.
    Then Verify a duplicate-specific error message is displayed (e.g. "Employee ID already exists").
    Then Verify only one record exists in the system for the tested identifier.
    And [Cleanup] Delete the test record created in step 2 if the system allows.
