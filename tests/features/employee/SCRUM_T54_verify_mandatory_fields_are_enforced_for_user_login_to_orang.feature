# =============================================================================
# Zephyr Test Case : SCRUM-T54
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify mandatory fields are enforced for User Login to OrangeHRM Application
# Design Technique : Equivalence Partitioning (EP) — Empty/Null Partition
# Labels           : validation, negative, required-fields, ep-empty, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T54 User Login to OrangeHRM Application — Verify mandatory fields are enforced for User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T54 @validation @negative @required-fields @ep-empty
  Scenario: Verify mandatory fields are enforced for User Login to OrangeHRM Application
    Given [Pre-condition] User is logged in as Admin.
    Given Navigate to the User Login to OrangeHRM Application page or form.
    When Leave the First Name field completely empty (do not enter any value).
    When Leave the Last Name field completely empty (do not enter any value).
    And Leave any other mandatory fields empty.
    When Click the Save / Submit button without filling any required fields.
    And Observe all inline validation messages that appear below each empty field.
    Then Verify the form does NOT submit (URL remains on the form page).
    Then Verify the First Name field shows an error message (e.g. "Required").
    Then Verify the Last Name field shows an error message (e.g. "Required").
    Then [Negative check] Verify no partial record is created in the system.
