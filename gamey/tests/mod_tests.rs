use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;

// IMPORTANTE: usa tu crate (gamey)
use gamey::bot_server::{create_default_state, create_router};

#[tokio::test]
async fn test_status_endpoint_returns_ok() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"OK");
}

#[tokio::test]
async fn test_unknown_route_returns_404() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/no/existe")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_status_wrong_method_returns_405() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/status")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn test_history_route_exists() {
    let app = create_router(create_default_state());

    let response = app
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
}

#[tokio::test]
async fn test_session_create_route_exists() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/session")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{
                        "board_size": 5,
                        "external_player": 0,
                        "internal_bot_id": "random_bot"
                    }"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_session_get_route_exists() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/v1/game/session/test-session")
                .header("content-type", "application/json")
                .body(Body::from("null"))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_ne!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_session_move_route_exists() {
    let app = create_router(create_default_state());

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/game/session/fake-id/move")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"x":1,"y":1,"z":1}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_choose_route_exists() {
    let app = create_router(create_default_state());

    let body = r#"{
        "size": 3,
        "turn": 0,
        "players": ["B","R"],
        "layout": "./../...",
        "variant": "standard"
    }"#;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/v1/ybot/choose/random_bot")
                .header("content-type", "application/json")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_ne!(response.status(), StatusCode::NOT_FOUND);
}