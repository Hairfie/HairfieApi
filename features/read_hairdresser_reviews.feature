Feature: Read hairdresser reviews
  In order to know if an hairdresser is good
  As a user
  I need to be able to read its reviews

  Background:
    Given the hairdresser "Sarah Pelle" has the following reviews:
      | Date       | Rating | Review                                                   |
      | 2 days ago | 4.5    | Effing brilliant! Complimentry cocktail(s) with haircut. |
      | 4 days ago | 5.0    | By far the best salon I have ever been to!               |
      | 6 days ago | 4.0    | Good but a bit too busy and bling bling for me           |

  Scenario: Seeing reviews overview from hairdresser list
    Given I am on a hairdresser list containing "Sarah Pelle"
    When I scroll until I can see "Sarah Pelle" hairdresser's card
    Then I should see "Sarah Pelle" has 3 reviews and average rating of 4.5

  Scenario: Reading last 2 reviews from the hairdresser's details page
    When I open the "Sarah Pelle" hairdresser's details screen
    Then I should see the average rating is 4.5
    And I should see the "Effing brilliant" review
    And I should see the "By far the best" review
    But I should not see the "Good but a bit too busy" review
    And I should see a "See all reviews (3)" button

  Scenario: Reading all reviews from reviews screen
    Given I am on the "Sarah Pelle" hairdresser's details screen
    When I tap on "See all reviews (3)" button
    Then I should arrive on the "Sarah Pelle" hairdresser's reviews screen
    And I should see a list of 3 reviews
