# =============================================================================
# Zephyr Test Case : SCRUM-T41
# Title            : Verify Employee Creation handles special characters and unicode
# Priority         : Normal
# Labels           : edge-case, special-characters, unicode, error-guessing
# =============================================================================

Feature: SCRUM-T41 Employee Creation - Special Characters and Unicode

  Background:
    Given the browser is open at the OrangeHRM application

  @unicode @edge-case @special-characters @error-guessing
  Scenario: Verify system accepts unicode accented characters in name fields
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "Müller" and last name "O'Brien"
    And I submit the employee form
    Then the page URL should not contain an error

  @unicode @edge-case @special-characters @error-guessing
  Scenario: Verify system handles symbol characters in name fields without crashing
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "Test@User" and last name "Hash#Name"
    And I submit the employee form
    Then the page URL should not contain an error
