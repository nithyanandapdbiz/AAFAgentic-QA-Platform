# =============================================================================
# Zephyr Test Case : SCRUM-T34
# Title            : Verify Employee Creation handles maximum number of characters
# Priority         : Normal
# Labels           : boundary, edge-case, bva, max-records
# =============================================================================

Feature: SCRUM-T34 Employee Creation - Maximum Field Length

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T34 @boundary @bva @max-length
  Scenario: Verify single-character names are accepted (minimum field length)
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "A" and last name "B"
    And I submit the employee form
    Then the page URL should not contain an error

  @SCRUM-T34 @boundary @bva @max-length
  Scenario: Verify 50-character names are accepted (maximum allowed field length)
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name with 50 characters and last name with 50 characters
    And I submit the employee form
    Then the page URL should not contain an error

  @SCRUM-T34 @boundary @bva @max-length
  Scenario: Verify 101-character names do not cause a system error (over-maximum)
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name with 101 characters and last name with 101 characters
    And I submit the employee form
    Then the page URL should not contain an error
