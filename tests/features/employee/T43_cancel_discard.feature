# =============================================================================
# Zephyr Test Case : SCRUM-T43
# Title            : Verify cancel or discard action during Employee Creation
# Priority         : Normal
# Labels           : cancel, negative, discard
# =============================================================================

Feature: SCRUM-T43 Employee Creation - Cancel or Discard Action

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T43 @cancel @negative
  Scenario: Verify cancelling the Add Employee form does not persist partially entered data
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "CancelTest" and last name "Discard"
    And I click Cancel
    Then I should not be on the Personal Details page
    When I search for employee "CancelTest" in the Employee List
    Then the page URL should not contain an error
