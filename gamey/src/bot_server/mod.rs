//! HTTP server for Y game bots.
//!
//! This module provides an Axum-based REST API for querying Y game bots
//! and managing game state.
//!
//! # Endpoints
//! - `GET  /status`                         — Health check
//! - `POST /{api_version}/ybot/choose/{bot_id}` — Request a move from a bot
//! - `POST /{api_version}/game/move`             — Apply a human move and get new state
//!
//! # CORS
//! All endpoints allow cross-origin requests so the React webapp (port 80)
//! can call this server (port 4000) freely.

pub mod choose;
pub mod error;
pub mod game_move;

pub mod state;
pub mod version;

use axum::http::Method;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub use choose::MoveResponse;
pub use error::ErrorResponse;
pub use version::*;

use crate::{GameYError, RandomBot, YBotRegistry, state::AppState};
use axum::response::IntoResponse;

/// Creates the Axum router with all routes and CORS middleware.
pub fn create_router(state: AppState) -> axum::Router {
    // Allow the webapp origin to call the gamey server
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    axum::Router::new()
        .route("/status", axum::routing::get(status))
        .route(
            "/{api_version}/ybot/choose/{bot_id}",
            axum::routing::post(choose::choose),
        )
        // ...
        .route("/{api_version}/game/move", axum::routing::post(game_move::make_move))
        .with_state(state)
        .layer(cors)
}

/// Creates the default application state with the standard bot registry.
pub fn create_default_state() -> AppState {
    let bots = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    AppState::new(bots)
}

/// Starts the bot server on the specified port.
pub async fn run_bot_server(port: u16) -> Result<(), GameYError> {
    let state = create_default_state();
    let app = create_router(state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Failed to bind to {}: {}", addr, e),
        })?;

    println!("Server mode: Listening on http://{}", addr);
    axum::serve(listener, app)
        .await
        .map_err(|e| GameYError::ServerError {
            message: format!("Server error: {}", e),
        })?;

    Ok(())
}

/// Health check endpoint.
pub async fn status() -> impl IntoResponse {
    "OK"
}