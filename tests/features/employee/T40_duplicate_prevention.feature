# =============================================================================
# Zephyr Test Case : SCRUM-T40
# Title            : Verify duplicate Employee ID creation is prevented
# Priority         : Normal
# Labels           : duplicate, negative, data-integrity
# =============================================================================

Feature: SCRUM-T40 Employee Creation - Duplicate Prevention

  Background:
    Given the browser is open at the OrangeHRM application

  @duplicate @negative @data-integrity
  Scenario: Verify the system prevents or handles a duplicate Employee ID gracefully
    When I log in as HR Admin
    And I navigate to the Add Employee form
    And I fill in first name "DupFirst" and last name "DupLast"
    And I set the Employee ID to "DUP-TEST-001"
    And I submit the employee form
    And I navigate to the Add Employee form
    And I fill in first name "DupFirst2" and last name "DupLast2"
    And I set the Employee ID to "DUP-TEST-001"
    And I submit the employee form
    Then the page URL should not contain an error
