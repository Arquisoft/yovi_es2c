package io.gatling.demo

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._

class LoginSimulation extends Simulation {

  private val httpProtocol = http
    .baseUrl("http://localhost:3000")
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

  private val scn = scenario("LoginSimulation")
    .exec(
      http("request_0")
        .options("/login")
        .headers(headers_0)
        .resources(
          http("request_1")
            .post("/login")
            .headers(headers_1)
            .body(RawFileBody("io/gatling/demo/loginsimulation/0001_request.json"))
            .check(
              bodyString.saveAs("responseBody") // guardamos la respuesta
            )
        )
    )
    .exec { session =>
      println("RESPONSE:")
      println(session("responseBody").asOption[String].getOrElse("No response"))
      session
    }

  setUp(scn.inject(atOnceUsers(5))).protocols(httpProtocol)
}