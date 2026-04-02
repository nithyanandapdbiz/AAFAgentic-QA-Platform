# =============================================================================
# Zephyr Test Case : SCRUM-T33
# Title            : Verify data is persisted correctly after Employee Creation
# Priority         : Normal
# Labels           : persistence, state-transition, data-integrity
# =============================================================================

Feature: SCRUM-T33 Employee Creation - Data Persistence

  Background:
    Given the browser is open at the OrangeHRM application

  @SCRUM-T33 @persistence @state-transition
  Scenario: Verify employee first name and last name are persisted correctly after save
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "Persist" and last name with a unique timestamp suffix
    And I set the Employee ID with a unique timestamp suffix
    And I submit the employee form
    Then I should be redirected to the Personal Details page
    And the "firstName" field should display "Persist"
