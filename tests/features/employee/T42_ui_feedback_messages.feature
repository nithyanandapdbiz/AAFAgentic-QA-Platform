# =============================================================================
# Zephyr Test Case : SCRUM-T42
# Title            : Verify UI feedback messages are correct for Employee Creation
# Priority         : Normal
# Labels           : ui-feedback, validation
# =============================================================================

Feature: SCRUM-T42 Employee Creation - UI Feedback Messages

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T42 @ui-feedback @smoke
  Scenario: Verify success feedback is shown after valid employee submission
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "UIFeedback" and last name "Success"
    And I submit the employee form
    Then I should be redirected to the Personal Details page
    And the employee profile header should be visible

  @SCRUM-T42 @ui-feedback @negative @validation
  Scenario: Verify validation error feedback is shown when required fields are empty
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I clear all required name fields
    And I submit the employee form
    Then validation error messages should be visible
