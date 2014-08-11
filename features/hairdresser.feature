Feature: Interacting with an hairdresser

  Background:
    Given there is a user at a position with GPS coordinates "48.8673885,2.3370847"
    And he clicked on the button "Around me"
    And he could see a list of salons and hairdresser at home
    And he choose the first one

  Scenario: Calling the hairdresser
    When I click on the "Book" button
    Then I should be able to call the hairdresser