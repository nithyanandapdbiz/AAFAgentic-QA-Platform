# =============================================================================
# Zephyr Test Case : SCRUM-T63
# Story            : SCRUM-6 — User Login to OrangeHRM Application
# Title            : Verify role-based access control for User Login to OrangeHRM Application
# Design Technique : Decision Table (DT) — Role × Permission matrix
# Labels           : security, authorization, rbac, decision-table, scrum-6
# Auto-generated   : run-story.js → Zephyr → Cucumber (GWT)
# =============================================================================

Feature: SCRUM-T63 User Login to OrangeHRM Application — Verify role-based access control for User Login to OrangeHRM Application

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T63 @security @authorization @rbac @decision-table
  Scenario: Verify role-based access control for User Login to OrangeHRM Application
    Given [Pre-condition] Identify all roles relevant to User Login to OrangeHRM Application (Admin, ESS User, Supervisor).
    Then Log in as a user with the Admin role. Attempt to perform User Login to OrangeHRM Application. Verify the action succeeds.
    Given Log out. Log in as an ESS User (no admin rights). Navigate to User Login to OrangeHRM Application page.
    Then Verify the action is blocked — either the URL redirects, the button is disabled, or an "Access Denied" message shows.
    Then Log out. Log in as a Supervisor role. Attempt the same action. Verify blocked as per role matrix.
    Then Access the URL directly without being logged in — verify redirect to login page.
    Then [Post-condition] Confirm no unauthorised actions were recorded in the system audit log.
