Feature: Register
  Validate the register form

  Scenario: Successful registration
    Given the register page is open
    When I enter "Labra" as the username and submit