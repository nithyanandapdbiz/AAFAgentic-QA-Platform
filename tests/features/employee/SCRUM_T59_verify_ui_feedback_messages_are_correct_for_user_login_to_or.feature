# =============================================================================
# Zephyr Test Case : SCRUM-T59
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify UI feedback messages are correct for User Login to OrangeHRM Application
# Design Technique : Use Case / Scenario-based (UC) — UI response verification
# Labels           : ui, usability, feedback, use-case, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T59 User Login to OrangeHRM Application — Verify UI feedback messages are correct for User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T59 @ui @usability @feedback @use-case
  Scenario: Verify UI feedback messages are correct for User Login to OrangeHRM Application
    Given [Pre-condition] User is logged in as Admin. Navigate to User Login to OrangeHRM Application form.
    When [Positive] Complete a successful User Login to OrangeHRM Application with valid data (First Name: "UITest", Last Name: "User").
    Then Verify the success toast / notification appears and reads "Successfully Saved" (or equivalent).
    Then Verify the success message is visible for the expected duration, then disappears or has a dismiss option.
    Then Verify the success message is free from spelling mistakes and grammatical errors.
    When [Negative] Submit the form with empty required fields.
    Then Verify field-level error messages appear in red / highlighted styling.
    Then Verify error messages are actionable (e.g. "First Name is required" not just "Error").
    When [Recovery] Fill valid data after seeing errors and re-submit.
    Then Verify the form recovers cleanly, error messages clear, and success is shown.
