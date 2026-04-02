# =============================================================================
# Zephyr Test Case : SCRUM-T61
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify data is persisted correctly after User Login to OrangeHRM Application
# Design Technique : State Transition (ST) — Created → Saved → Retrieved
# Labels           : data-integrity, persistence, regression, state-transition, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T61 User Login to OrangeHRM Application — Verify data is persisted correctly after User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T61 @data-integrity @persistence @regression @state-transition
  Scenario: Verify data is persisted correctly after User Login to OrangeHRM Application
    Given [State: Pre-action] Count existing records before test (note the total).
    Given Navigate to User Login to OrangeHRM Application form. Enter First Name: "PersistTest", Middle Name: "Verify", Last Name: "DataCheck".
    Then Click Save. Verify success message appears.
    And [State: Record Created] Note the assigned employee ID or unique identifier.
    And Navigate away from the page to the employee list/dashboard.
    When [State: Navigated Away] Return to the employee list and search for "PersistTest".
    When Open the newly created record.
    Then [State: Retrieved] Verify First Name = "PersistTest" (exact match, including case).
    Then Verify Middle Name = "Verify" (exact match).
    Then Verify Last Name = "DataCheck" (exact match).
    Then Verify total record count increased by exactly 1 compared to pre-action count.
