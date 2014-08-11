Feature: Choosing an hairdresser

  Background:
    Given there is a user at a position with GPS coordinates "48.8673885,2.3370847"
    And he clicked on the button "Around me"
    And he could see a list of salons and hairdresser at home
    And he could be able to see the salons on a map with my position on the center

  Scenario: Choosing the hairdresser on the map
    When I click on a pin on the map
    Then I should see a the specific salon in the list highlighted

  Scenario: Choosing an hairdresser in the list
    When I click on an item in the list
    Then I should see a page with details about this hairdresser