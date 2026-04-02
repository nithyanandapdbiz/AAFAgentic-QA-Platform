# =============================================================================
# Zephyr Test Case : SCRUM-T62
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify User Login to OrangeHRM Application with the maximum number of records
# Design Technique : Boundary Value Analysis (BVA) — Volume / capacity boundary
# Labels           : performance, boundary, edge-case, bva-volume, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T62 User Login to OrangeHRM Application — Verify User Login to OrangeHRM Application with the maximum number of records

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T62 @performance @boundary @edge-case @bva-volume
  Scenario: Verify User Login to OrangeHRM Application with the maximum number of records
    Given [Pre-condition] Identify the system's maximum record limit for User Login to OrangeHRM Application (from documentation or config).
    When Create records up to near-maximum capacity (or use existing data if already near limit).
    Then Attempt to perform User Login to OrangeHRM Application at the near-maximum threshold and verify normal behaviour.
    When Attempt to perform User Login to OrangeHRM Application at the exact maximum limit. Observe and document the response.
    When Attempt to perform User Login to OrangeHRM Application one record beyond the maximum limit.
    Then Verify the system displays a meaningful limit-exceeded error message (not a crash or 500 error).
    Then Verify system performance: page load, search, and save operations remain within acceptable time (< 5 seconds).
    Then Verify the system does not create partial records or corrupt existing data at capacity boundary.
