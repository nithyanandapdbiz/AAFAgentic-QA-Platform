# =============================================================================
# Zephyr Test Case : SCRUM-T60
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify cancel or discard action during User Login to OrangeHRM Application
# Design Technique : State Transition (ST) — In-progress → Cancelled transition
# Labels           : cancel, negative, data-integrity, state-transition, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T60 User Login to OrangeHRM Application — Verify cancel or discard action during User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T60 @cancel @negative @data-integrity @state-transition
  Scenario: Verify cancel or discard action during User Login to OrangeHRM Application
    Given [Pre-condition] User is logged in as Admin. Navigate to User Login to OrangeHRM Application form.
    Then [State: Form Empty] Verify the form starts in an empty state.
    When [State: Partially Filled] Enter First Name: "CancelTest" and Last Name: "Partial" without submitting.
    When Without clicking Save, click the Cancel button (or navigate away using the browser Back button).
    And [State: Cancelled] Observe what happens — browser may show an "unsaved changes" warning.
    Then If a warning appears, confirm the discard action.
    Then [State: Returned] Verify the user is returned to the previous page or employee list.
    Then Navigate to the employee list and search for "CancelTest". Verify no partial record exists.
    Then Verify zero data was persisted from the cancelled form entry.
