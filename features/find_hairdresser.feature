Feature: Finding an hairdresser

  Background:
    Given there is a user at a position with GPS coordinates "48.8673885,2.3370847"

  Scenario: Searching for an hairdresser around me
    When I search for an hairdresser around me
    Then I should see a list of salons and hairdresser at home
    And I should be able to see the salons on a map with my position on the center

  Scenario: Searching for an hairdresser in a specific place
    When I search for an hairdresser around a place called "La Défense"
    Then I should see a list of salons and hairdresser near that place at home
    And I should be able to see the salons on a map around the place

  Scenario: Searching for an hairdresser around me with a query
    When I search for an hairdresser around me with a query "Frank Provost"
    Then I should see a list of salons and hairdresser at home matching my query
    And I should be able to see the salons on a map around the place

  Scenario: Searching for an hairdresser in a specific place with a query
    When I search for an hairdresser around a place called "La Défense" with a query "Frank Provost"
    Then I should see a list of salons and hairdresser at home near that place matching my query
    And I should be able to see the salons on a map around the place

  Scenario: When I scroll on the list
    When I have the list after a search
    And I scroll down the page
    Then I should see other hairdressers matching the previous query