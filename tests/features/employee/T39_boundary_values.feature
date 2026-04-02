# =============================================================================
# Zephyr Test Case : SCRUM-T39
# Title            : Verify boundary values are handled correctly for Employee Creation
# Priority         : Normal
# Labels           : boundary, edge-case, bva
# BVA Points       : min=1 char, max=50 chars, over-max=101 chars
# =============================================================================

Feature: SCRUM-T39 Employee Creation - Boundary Value Analysis

  Background:
    Given the browser is open at the OrangeHRM application

  @boundary @bva @edge-case
  Scenario: BVA-1 Verify minimum boundary value - single character names are accepted
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "A" and last name "B"
    And I submit the employee form
    Then the page URL should not contain an error

  @boundary @bva @edge-case
  Scenario: BVA-4 Verify maximum boundary value - 50-character names are accepted
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name with 50 characters and last name with 50 characters
    And I submit the employee form
    Then the page URL should not contain an error

  @boundary @bva @edge-case
  Scenario: BVA-5 Verify over-maximum boundary - 101-character names do not cause a system error
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name with 101 characters and last name with 101 characters
    And I submit the employee form
    Then the page URL should not contain an error
