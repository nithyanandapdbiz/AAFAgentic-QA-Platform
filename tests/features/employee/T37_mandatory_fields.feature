# =============================================================================
# Zephyr Test Case : SCRUM-T37
# Title            : Verify mandatory fields are enforced for Employee Creation
# Priority         : Normal
# Labels           : validation, negative, required-fields, ep-empty
# =============================================================================

Feature: SCRUM-T37 Employee Creation - Mandatory Fields Validation

  Background:
    Given the browser is open at the OrangeHRM application

  @negative @validation @required-fields @ep-empty
  Scenario: Verify mandatory fields are enforced when all required fields are empty
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I clear all required name fields
    And I submit the employee form
    Then validation error messages should be visible
    And I should not be on the Personal Details page
