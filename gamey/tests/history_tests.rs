use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use gamey::{create_default_state, create_router};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;

fn app() -> axum::Router {
    create_router(create_default_state())
}

// ============================================================================
// HISTORY ROUTE
// ============================================================================

#[tokio::test]
async fn test_history_route_ok_or_error_json() {
    let response = app()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/game/history")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();

    // Si la DB funciona, debe venir api_version + games.
    // Si la DB falla, al menos debe venir message.
    assert!(json.get("games").is_some() || json.get("message").is_some());

    if json.get("games").is_some() {
        assert_eq!(json["api_version"], "v1");
        assert!(json["games"].is_array());
    }
}

#[tokio::test]
async fn test_history_invalid_api_version() {
    let response = app()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v2/game/history")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let json: Value = serde_json::from_slice(&bytes).unwrap();

    assert!(json.get("message").is_some());
    assert!(json["message"]
        .as_str()
        .unwrap()
        .contains("Unsupported API version"));
}

#[tokio::test]
async fn test_history_wrong_method() {
    let response = app()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/history")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert!(
        response.status() == StatusCode::METHOD_NOT_ALLOWED
            || response.status() == StatusCode::NOT_FOUND
    );
}