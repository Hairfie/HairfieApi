Feature: Find hairdressers around me
  In order to find a hairdresser near my current location
  As a user
  I need to be able to list hairdresser around me

  Scenario: Listing hairdressers within 500m around me
    Given the following hairdressers:
      | Name             | Distance |
      | Jacques Dessange | 200m     |
      | Camille Albane   | 430m     |
      | Saint Algue      | 940m     |
    And I am on the home screen
    When I touch the around me button
    Then I should arrive on a hairdresser list
    And I should see "Jacques Dessange"
    And I should see "Camille Albane"
    But I should not see "Saint Algue"
