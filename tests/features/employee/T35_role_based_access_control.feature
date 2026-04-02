# =============================================================================
# Zephyr Test Case : SCRUM-T35
# Title            : Verify Role-Based Access Control for Employee Creation
# Priority         : Normal
# Labels           : security, authorization, rbac, decision-table
# =============================================================================

Feature: SCRUM-T35 Employee Creation - Role-Based Access Control

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T35 @security @rbac @authorization
  Scenario: Verify Admin role can access the Employee List
    When I log in as HR Admin
    And I navigate to the Employee List page
    Then the Employee List should be accessible

  @SCRUM-T35 @security @rbac @authorization
  Scenario: Verify Admin role can access the Add Employee form
    When I log in as HR Admin
    And I navigate to the Add Employee form
    Then the Add Employee form should be accessible

  @SCRUM-T35 @security @rbac @authorization
  Scenario: Verify unauthenticated access to PIM module redirects to the Login page
    When I clear my session cookies
    And I navigate to the Add Employee URL directly
    Then I should be redirected to the Login page
