# =============================================================================
# Zephyr Test Case : SCRUM-T36
# Title            : Verify successful employee creation with valid inputs
# Priority         : Normal
# Labels           : happy-path, smoke, ep-valid
# =============================================================================

Feature: SCRUM-T36 Employee Creation - Happy Path

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T36 @smoke @happy-path @ep-valid
  Scenario: Verify successful employee creation with valid inputs
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "AutoTest" and last name "Employee"
    And I submit the employee form
    Then I should be redirected to the Personal Details page
    And the employee profile header should be visible
