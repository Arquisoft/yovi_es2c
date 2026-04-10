package io.gatling.demo

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._

class RecordedSimulation extends Simulation {

  private val httpProtocol = http
    .baseUrl("http://localhost:4000")
    .inferHtmlResources()
    .acceptHeader("*/*")
    .acceptEncodingHeader("gzip, deflate, br")
    .acceptLanguageHeader("en-US,en;q=0.9")
    .originHeader("http://localhost")
    .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0")
  
  private val headers_0 = Map(
  		"Access-Control-Request-Headers" -> "content-type",
  		"Access-Control-Request-Method" -> "POST",
  		"Priority" -> "u=4",
  		"Sec-Fetch-Dest" -> "empty",
  		"Sec-Fetch-Mode" -> "cors",
  		"Sec-Fetch-Site" -> "same-site"
  )
  
  private val headers_1 = Map(
  		"Content-Type" -> "application/json",
  		"Priority" -> "u=0",
  		"Sec-Fetch-Dest" -> "empty",
  		"Sec-Fetch-Mode" -> "cors",
  		"Sec-Fetch-Site" -> "same-site"
  )
  
  private val uri1 = "localhost"

  private val scn = scenario("RecordedSimulation")
    .exec(
      http("request_0")
        .options("http://" + uri1 + ":3000/register")
        .headers(headers_0)
        .resources(
          http("request_1")
            .post("http://" + uri1 + ":3000/register")
            .headers(headers_1)
            .body(RawFileBody("io/gatling/demo/recordedsimulation/0001_request.json"))
        ),
      pause(3),
      http("request_2")
        .options("/v1/game/move")
        .headers(headers_0)
        .resources(
          http("request_3")
            .post("/v1/game/move")
            .headers(headers_1)
            .body(RawFileBody("io/gatling/demo/recordedsimulation/0003_request.json"))
        ),
      pause(1),
      http("request_4")
        .options("/v1/game/move")
        .headers(headers_0)
        .resources(
          http("request_5")
            .post("/v1/game/move")
            .headers(headers_1)
            .body(RawFileBody("io/gatling/demo/recordedsimulation/0005_request.json")),
          http("request_6")
            .options("/v1/game/move")
            .headers(headers_0),
          http("request_7")
            .post("/v1/game/move")
            .headers(headers_1)
            .body(RawFileBody("io/gatling/demo/recordedsimulation/0007_request.json"))
        )
    )

	setUp(scn.inject(atOnceUsers(5))).protocols(httpProtocol)
}
