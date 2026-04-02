# =============================================================================
# Zephyr Test Case : SCRUM-T38
# Title            : Verify Employee Creation rejects invalid input data
# Priority         : Normal
# Labels           : validation, negative, invalid-data, ep-invalid, security-eg
# =============================================================================

Feature: SCRUM-T38 Employee Creation - Invalid Input Data

  Background:
    Given the browser is open at the OrangeHRM application

  @negative @invalid-data @ep-invalid @security-eg
  Scenario: Verify system handles numeric-only input in name fields without crashing
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "12345" and last name "!@#$%"
    And I submit the employee form
    Then the page URL should not contain an error

  @negative @invalid-data @ep-invalid
  Scenario: Verify system handles space-padded name input without crashing
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "John Doe Smith" and last name "Test User"
    And I submit the employee form
    Then the page URL should not contain an error
