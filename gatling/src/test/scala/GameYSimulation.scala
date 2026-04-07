import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GameYSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:4000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  val userFeeder = Array(
    Map("username" -> "alice"),
    Map("username" -> "bob"),
    Map("username" -> "carol"),
    Map("username" -> "dave"),
    Map("username" -> "erin")
  ).circular

  val emptyYenJson: String =
    """{
      "size": 5,
      "turn": 0,
      "players": ["B", "R"],
      "layout": "../.../.../..../.....",
      "variant": "standard"
    }"""

  val scn = scenario("Partida_GameY")
    .feed(userFeeder)
    .exec(
      http("01_status")
        .get("/status")
        .check(status.is(200))
    )
    .pause(500.milliseconds, 1.second)
    .exec { session =>
      val startTs = System.currentTimeMillis() / 1000
      session
        .set("yenState", emptyYenJson)
        .set("startTs", startTs)
    }
    .exec(
      http("02_primer_movimiento")
        .post("/v1/game/move")
        .body(StringBody(
          """{
            "yen": ${yenState},
            "x": 4,
            "y": 0,
            "z": 0,
            "username": "${username}",
            "duration_seconds": 0
          }"""
        )).asJson
        .check(status.is(200))
        .check(jsonPath("$.yen").saveAs("yenState"))
    )
    .pause(1.second, 2.seconds)
    .exec(
      http("03_movimiento_intermedio")
        .post("/v1/game/move")
        .body(StringBody(
          """{
            "yen": ${yenState},
            "x": 3,
            "y": 1,
            "z": 0,
            "username": "${username}",
            "duration_seconds": 5
          }"""
        )).asJson
        .check(status.is(200))
        .check(jsonPath("$.yen").saveAs("yenState"))
    )
    .pause(1.second, 3.seconds)
    .exec(
      http("04_movimiento_final")
        .post("/v1/game/move")
        .body(StringBody(
          """{
            "yen": ${yenState},
            "x": 2,
            "y": 2,
            "z": 0,
            "username": "${username}",
            "duration_seconds": 10
          }"""
        )).asJson
        .check(status.in(200, 400, 409))
    )
    .pause(1.second)

  setUp(
    scn.inject(
      atOnceUsers(5),
      rampUsers(5) during (30.seconds)
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.mean.lt(500),
     global.failedRequests.percent.lt(5)
   )
}