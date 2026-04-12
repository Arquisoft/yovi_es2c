use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;

use gamey::bot_server::{create_default_state, create_router};

fn empty_yen(size: u32) -> String {
    let layout = (0..size)
        .map(|r| ".".repeat((r + 1) as usize))
        .collect::<Vec<_>>()
        .join("/");

    format!(
        r#"{{
            "size": {},
            "turn": 0,
            "players": ["B","R"],
            "layout": "{}",
            "variant": "standard"
        }}"#,
        size, layout
    )
}

#[tokio::test]
async fn test_make_move_ok() {
    let app = create_router(create_default_state());

    let body = format!(
        r#"{{
            "yen": {},
            "x": 2,
            "y": 0,
            "z": 0
        }}"#,
        empty_yen(3)
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/move")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();

    assert_eq!(json["status"], "ongoing");
    assert!(json.get("yen").is_some());
}

#[tokio::test]
async fn test_invalid_api_version() {
    let app = create_router(create_default_state());

    let body = format!(
        r#"{{
            "yen": {},
            "x": 2,
            "y": 0,
            "z": 0
        }}"#,
        empty_yen(3)
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v999/game/move")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();

    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("Unsupported API version"));
}

#[tokio::test]
async fn test_invalid_move_on_occupied_cell() {
    let app = create_router(create_default_state());

    // Ya hay una ficha en (2,0,0)
    let yen = r#"{
        "size": 3,
        "turn": 1,
        "players": ["B","R"],
        "layout": "B/../...",
        "variant": "standard"
    }"#;

    let body = format!(
        r#"{{
            "yen": {},
            "x": 2,
            "y": 0,
            "z": 0
        }}"#,
        yen
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/move")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("Illegal move"));
}

#[tokio::test]
async fn test_move_on_finished_game() {
    let app = create_router(create_default_state());

    let yen = r#"{
        "size": 1,
        "turn": 0,
        "players": ["B","R"],
        "layout": "B",
        "variant": "standard"
    }"#;

    let body = format!(
        r#"{{
            "yen": {},
            "x": 0,
            "y": 0,
            "z": 0
        }}"#,
        yen
    );

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/move")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();

    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("Game is already finished"));
}

#[tokio::test]
async fn test_missing_body_fields() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/move")
                .header("content-type", "application/json")
                .body(Body::from(r#"{}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(response.status().is_client_error());
}