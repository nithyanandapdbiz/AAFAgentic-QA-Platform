# =============================================================================
# Zephyr Test Case : SCRUM-T56
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify boundary values are handled correctly for User Login to OrangeHRM Application
# Design Technique : Boundary Value Analysis (BVA) — Min, Min+1, Max-1, Max, Max+1
# Labels           : boundary, edge-case, bva, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T56 User Login to OrangeHRM Application — Verify boundary values are handled correctly for User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T56 @boundary @edge-case @bva
  Scenario: Verify boundary values are handled correctly for User Login to OrangeHRM Application
    Given [Pre-condition] User is logged in as Admin. Navigate to User Login to OrangeHRM Application form.
    Then [BVA-1] Enter minimum boundary value: single character "A" in First Name and "B" in Last Name. Submit and verify the form accepts it.
    Then [BVA-2] Enter Min+1 boundary value: two characters "AB" in First Name. Submit and verify acceptance.
    Then [BVA-3] Navigate back and enter Max-1 boundary value: 49-character string in First Name. Submit and verify acceptance.
    Then [BVA-4] Navigate back and enter the exact maximum boundary: 50-character string in First Name. Submit and verify acceptance.
    Then [BVA-5] Navigate back and enter Max+1 boundary: 51-character string in First Name. Submit and verify rejection with error message.
    And Record actual system behaviour for each boundary point in a table.
    Then Verify that accepted boundary values are correctly persisted and displayed.
