# =============================================================================
# Zephyr Test Case : SCRUM-T55
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify User Login to OrangeHRM Application rejects invalid input data
# Design Technique : Equivalence Partitioning (EP) — Invalid Partition + Error Guessing (EG)
# Labels           : negative, invalid-data, validation, ep-invalid, security-eg, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T55 User Login to OrangeHRM Application — Verify User Login to OrangeHRM Application rejects invalid input data

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T55 @negative @invalid-data @validation @ep-invalid @security-eg
  Scenario: Verify User Login to OrangeHRM Application rejects invalid input data
    Given [Pre-condition] User is logged in as Admin. Navigate to User Login to OrangeHRM Application form.
    When Enter numeric-only value "12345" in the First Name field.
    When Enter special characters "!@#$%^&*" in the Last Name field.
    When Click Save / Submit and observe any validation errors shown.
    When Clear the fields and enter HTML injection attempt "<script>alert(1)</script>" in First Name.
    Then Click Save / Submit and verify the system handles this without executing script.
    When Clear the fields and enter a value with spaces "John Doe Smith" in a username-type field.
    Then Submit and observe system response (expect validation error or sanitised output).
    Then Verify no system crash, 500 error, or unhandled exception occurs at any point.
    Then [Post-condition] Confirm no invalid records were persisted in the database.
