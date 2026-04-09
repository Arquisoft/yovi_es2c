import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class GameYSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:4000")
    .acceptHeader("application/json")

  val userFeeder = Array(
    Map("username" -> "alice"),
    Map("username" -> "bob"),
    Map("username" -> "carol"),
    Map("username" -> "dave"),
    Map("username" -> "erin")
  ).circular

  val emptyYenJson: String =
    """{
      "size": 7,
      "turn": 0,
      "players": ["B", "R"],
      "layout": "./../.../..../...../....../.......",
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
        .header("Content-Type", "application/json")
        .body(StringBody(
          """{
            "yen": #{yenState},
            "x": 2,
            "y": 0,
            "z": 0
          }"""
        ))
        .check(status.is(200))
        .check(status.saveAs("status02"))
        .check(bodyString.saveAs("respBody02"))
        .check(jsonPath("$.yen").saveAs("yenState"))
    )

    .exec { session =>
      println(s"[DEBUG] 02 status=${session("status02").asOption[Int]}")
      println(s"[DEBUG] 02 body=${session("respBody02").asOption[String]}")
      session
    }

    .pause(1.second, 3.seconds)

    .exec(
      http("03_movimiento_2")
        .post("/v1/game/move")
        .header("Content-Type", "application/json")
        .body(StringBody(
          """{
            "yen": #{yenState},
            "x": 2,
            "y": 1,
            "z": 0
          }"""
        ))
        .check(status.is(200))
        .check(jsonPath("$.yen").saveAs("yenState"))
    )

    .pause(1.second, 3.seconds)

    .exec(
      http("04_movimiento_final")
        .post("/v1/game/move")
        .header("Content-Type", "application/json")
        .body(StringBody(
          """{
            "yen": #{yenState},
            "x": 2,
            "y": 2,
            "z": 0
          }"""
        ))
        .check(status.in(200, 400, 409))
    )

    .pause(1.second)

  setUp(
    scn.inject(
      atOnceUsers(1)
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.mean.lt(500),
     global.failedRequests.percent.lt(5)
   )
}
