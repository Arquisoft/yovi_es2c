Feature: Autenticacion y flujo base
  Escenarios E2E para acceso y navegación principal.

  Scenario: Registro exitoso con usuario nuevo
    Given la app de Yovi esta abierta
    When selecciono el modo "Register"
    And registro un usuario nuevo con base "e2e_user" y password "Secret123"
    Then veo el lobby de juego

  Scenario: Login despues de un registro
    Given la app de Yovi esta abierta
    When registro un usuario nuevo con base "e2e_user" y password "Secret123"
    Then veo el lobby de juego
    When cierro sesion
    And inicio sesion con las mismas credenciales
    Then veo el lobby de juego

  Scenario: Validacion de password corta en registro
    Given la app de Yovi esta abierta
    When selecciono el modo "Register"
    And completo el formulario con usuario "e2e_short" y password "123"
    And confirmo la password "123"
    And envio el formulario
    Then veo el mensaje de error "Password must be at least 6 characters."

  Scenario: Seleccion de tamano y acceso a partida local
    Given la app de Yovi esta abierta
    When registro un usuario nuevo con base "e2e_menu" y password "Secret123"
    Then veo el lobby de juego
    When selecciono el tamano de tablero 9
    Then veo el texto del tablero "Lados del triángulo: 9 celdas"
    When inicio una partida local
    Then veo la pantalla de juego

  Scenario: Registro falla si las contraseñas no coinciden
    Given la app de Yovi esta abierta
    When selecciono el modo "Register"
    And completo el formulario con usuario "e2e_mismatch" y password "Secret123"
    And confirmo la password "Secret321"
    And envio el formulario
    Then veo el mensaje de error "Passwords do not match."

  Scenario: Login falla con credenciales invalidas
    Given la app de Yovi esta abierta
    When selecciono el modo "Log in"
    And completo el formulario con usuario "usuario_inexistente" y password "Secret123"
    And envio el formulario
    Then veo el mensaje de error "Invalid username or password"

  Scenario: Ver historial vacio
    Given la app de Yovi esta abierta
    When registro un usuario nuevo con base "e2e_historial" y password "Secret123"
    Then veo el lobby de juego
    When hago clic en "Ver historial de partidas"
    Then veo el mensaje "Todavía no hay partidas registradas."

  Scenario: Modo bot muestra indicador de IA
    Given la app de Yovi esta abierta
    When registro un usuario nuevo con base "e2e_bot" y password "Secret123"
    Then veo el lobby de juego
    When selecciono el tamano de tablero 7
    And inicio una partida contra la IA
    Then veo el indicador "LA IA ESTÁ PENSANDO…"
