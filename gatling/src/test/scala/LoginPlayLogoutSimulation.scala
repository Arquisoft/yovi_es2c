import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class LoginPlayLogoutSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:3000")
    .acceptHeader("application/json")

  val username = "prueba"
  val password = "123456"

  val scn = scenario("Login_Play_Logout")
    .exec(
      http("01_register")
        .post("/register")
        .header("Content-Type", "application/json")
        .body(StringBody(
          s"""{
            "username": "$username",
            "password": "$password"
          }"""
        ))
        .check(status.in(201, 400, 409).saveAs("statusRegister"))
        .check(bodyString.saveAs("bodyRegister"))
    )

    .exec(
      http("02_login")
        .post("/login")
        .header("Content-Type", "application/json")
        .body(StringBody(
          s"""{
            "username": "$username",
            "password": "$password"
          }"""
        ))
        .check(status.saveAs("statusLogin"))
        .check(bodyString.saveAs("bodyLogin"))
    )

    .exec { session =>
      val yenJson =
        """{
          "size": 7,
          "turn": 0,
          "players": ["B", "R"],
          "layout": "./../.../..../...../....../.......",
          "variant": "standard"
        }"""
      session.set("yenState", yenJson)
    }

    .exec(
      http("03_game_move")
        .post("http://localhost:4000/v1/game/move")
        .header("Content-Type", "application/json")
        .body(StringBody(
          s"""{
            "yen": #{yenState},
            "x": 2,
            "y": 0,
            "z": 0,
            "username": "$username"
          }"""
        ))
        .check(status.saveAs("statusMove"))
        .check(bodyString.saveAs("bodyMove"))
    )

    .exec(
      http("04_game_result")
        .post("/game/result")
        .header("Content-Type", "application/json")
        .body(StringBody(
          s"""{
            "username": "$username",
            "won": true
          }"""
        ))
        .check(status.saveAs("statusResult"))
        .check(bodyString.saveAs("bodyResult"))
    )

  setUp(
    scn.inject(
      rampUsers(10).during(30.seconds)
    )
  ).protocols(httpProtocol)
}

