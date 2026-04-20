//! Session management endpoints for external bots.
//!
//! These endpoints allow an external bot to:
//! 1. Create a game session against an internal bot.
//! 2. Query the current state of the session.
//! 3. Submit a move and receive the internal bot's response automatically.
//!
//! # Routes
//! - `POST /{api_version}/game/session`
//! - `GET  /{api_version}/game/session/{session_id}`
//! - `POST /{api_version}/game/session/{session_id}/move`

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{
    Coordinates, GameStatus, GameY, Movement, PlayerId, YEN,
    db::{self, SessionRecord},
    error::ErrorResponse,
    state::AppState,
    version::check_api_version,
};

// ─── Create session ───────────────────────────────────────────────────────────

/// Request body to create a new game session.
#[derive(Deserialize)]
pub struct CreateSessionRequest {
    /// Board size (minimum 5).
    pub board_size: u32,
    /// Game variant: "standard" or "why_not".
    #[serde(default = "default_variant")]
    pub variant: String,
    /// Which player the external bot will control: 0 (Blue, goes first) or 1 (Red).
    #[serde(default)]
    pub external_player: u32,
    /// ID of the internal bot to play against (e.g. "random_bot", "side_bot").
    pub internal_bot_id: String,
}

fn default_variant() -> String {
    "standard".to_string()
}

/// Response after creating a session.
#[derive(Serialize)]
pub struct CreateSessionResponse {
    /// Unique identifier for this session.
    pub session_id: String,
    /// Initial game state.
    pub yen: YEN,
    /// Which player the external bot controls.
    pub external_player: u32,
    /// Which internal bot is playing against.
    pub internal_bot_id: String,
    /// Game status: "ongoing" or "finished".
    pub status: String,
    /// Winner if already decided (only possible if board_size = 1).
    pub winner: Option<u32>,
    /// Whose turn it is next.
    pub next_player: Option<u32>,
    
}

/// Creates a new game session between an external bot and an internal bot.
///
/// If the external bot is player 1 (Red), the internal bot plays first automatically.
#[axum::debug_handler]
pub async fn create_session(
    State(state): State<AppState>,
    Path(api_version): Path<String>,
    Json(req): Json<CreateSessionRequest>,
) -> Result<Json<CreateSessionResponse>, Json<ErrorResponse>> {
    check_api_version(&api_version)?;

    // Validate external_player
    if req.external_player > 1 {
        return Err(Json(ErrorResponse::error(
            "external_player must be 0 or 1",
            Some(api_version),
            None,
        )));
    }

    // Validate internal bot exists
    if state.bots().find(&req.internal_bot_id).is_none() {
        let available = state.bots().names().join(", ");
        return Err(Json(ErrorResponse::error(
            &format!("Bot not found: {}. Available: [{}]", req.internal_bot_id, available),
            Some(api_version),
            None,
        )));
    }

    // Build initial YEN
    let variant = match req.variant.as_str() {
        "why_not" => crate::core::game::Variant::WhyNot,
        _ => crate::core::game::Variant::Standard,
    };
    let game = GameY::new(req.board_size, variant);
    let yen: YEN = (&game).into();

    let session_id = db::new_session_id();
    let yen_json = serde_json::to_string(&yen).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(api_version.clone()), None))
    })?;

    let created_at = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let record = SessionRecord {
        session_id: session_id.clone(),
        yen_json,
        external_player: req.external_player,
        internal_bot_id: req.internal_bot_id.clone(),
        status: "ongoing".to_string(),
        winner: None,
        created_at,
    };

    // Save to DB
    let db = db::connect().await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(api_version.clone()), None))
    })?;
    db::create_session(&db, record).await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(api_version.clone()), None))
    })?;

    // If internal bot goes first (external_player = 1), play its move now
    let (final_yen, status, winner, next_player) = if req.external_player == 1 {
        play_internal_bot_turn(&state, &db, &session_id, yen, &req.internal_bot_id, &api_version).await?
    } else {
        let next = Some(yen.turn());
        (yen, "ongoing".to_string(), None, next)
    };

    Ok(Json(CreateSessionResponse {
        session_id,
        yen: final_yen,
        external_player: req.external_player,
        internal_bot_id: req.internal_bot_id,
        status,
        winner,
        next_player,
    }))
}

// ─── Get session ──────────────────────────────────────────────────────────────

/// Path parameters for session endpoints.
#[derive(Deserialize)]
pub struct SessionPath {
    pub api_version: String,
    pub session_id: String,
}

/// Response with current session state.
#[derive(Serialize)]
pub struct SessionStateResponse {
    pub session_id: String,
    pub yen: YEN,
    pub external_player: u32,
    pub internal_bot_id: String,
    pub status: String,
    pub winner: Option<u32>,
    pub next_player: Option<u32>,
}

/// Returns the current state of a session.
#[axum::debug_handler]
pub async fn get_session(
    Path(params): Path<SessionPath>,
    Json(()): Json<()>,
) -> Result<Json<SessionStateResponse>, Json<ErrorResponse>> {
    check_api_version(&params.api_version)?;

    let db = db::connect().await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    let record = db::get_session(&db, &params.session_id).await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?.ok_or_else(|| {
        Json(ErrorResponse::error(
            &format!("Session not found: {}", params.session_id),
            Some(params.api_version.clone()),
            None,
        ))
    })?;

    let yen: YEN = serde_json::from_str(&record.yen_json).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    let next_player = if record.status == "ongoing" { Some(yen.turn()) } else { None };

    Ok(Json(SessionStateResponse {
        session_id: record.session_id,
        yen,
        external_player: record.external_player,
        internal_bot_id: record.internal_bot_id,
        status: record.status,
        winner: record.winner,
        next_player,
    }))
}

// ─── Make move ────────────────────────────────────────────────────────────────

/// Path parameters for the move endpoint.
#[derive(Deserialize)]
pub struct SessionMovePath {
    pub api_version: String,
    pub session_id: String,
}

/// Request body for the external bot's move.
#[derive(Deserialize)]
pub struct SessionMoveRequest {
    /// X barycentric coordinate.
    pub x: u32,
    /// Y barycentric coordinate.
    pub y: u32,
    /// Z barycentric coordinate.
    pub z: u32,
}

/// Response after the external bot makes a move.
#[derive(Serialize)]
pub struct SessionMoveResponse {
    pub session_id: String,
    /// Updated YEN after both the external bot and internal bot have played.
    pub yen: YEN,
    pub status: String,
    pub winner: Option<u32>,
    pub next_player: Option<u32>,
}

/// Submits a move for the external bot and automatically plays the internal bot's response.
#[axum::debug_handler]
pub async fn session_move(
    State(state): State<AppState>,
    Path(params): Path<SessionMovePath>,
    Json(req): Json<SessionMoveRequest>,
) -> Result<Json<SessionMoveResponse>, Json<ErrorResponse>> {
    check_api_version(&params.api_version)?;

    let db = db::connect().await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    // Load session
    let mut record = db::get_session(&db, &params.session_id).await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?.ok_or_else(|| {
        Json(ErrorResponse::error(
            &format!("Session not found: {}", params.session_id),
            Some(params.api_version.clone()),
            None,
        ))
    })?;

    if record.status == "finished" {
        return Err(Json(ErrorResponse::error(
            "Session is already finished",
            Some(params.api_version.clone()),
            None,
        )));
    }

    let mut yen: YEN = serde_json::from_str(&record.yen_json).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    // Validate it's the external bot's turn
    if yen.turn() != record.external_player {
        return Err(Json(ErrorResponse::error(
            "It is not the external bot's turn",
            Some(params.api_version.clone()),
            None,
        )));
    }

    // Apply external bot's move
    let mut game = GameY::try_from(yen).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    let player = PlayerId::new(record.external_player);
    let coords = Coordinates::new(req.x, req.y, req.z);
    game.add_move(Movement::Placement { player, coords }).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Illegal move: {}", e),
            Some(params.api_version.clone()),
            None,
        ))
    })?;

    yen = (&game).into();

    // Check if game ended after external bot's move
    let (mut status, mut winner) = game_status_tuple(game.status());

    // If still ongoing, play internal bot's turn automatically
    if status == "ongoing" {
        let (new_yen, new_status, new_winner, _) = play_internal_bot_turn(
            &state, &db, &params.session_id, yen, &record.internal_bot_id, &params.api_version,
        ).await?;
        yen = new_yen;
        status = new_status;
        winner = new_winner;
    }

    // Update session in DB
    record.yen_json = serde_json::to_string(&yen).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;
    record.status = status.clone();
    record.winner = winner;
    db::update_session(&db, &record).await.map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(params.api_version.clone()), None))
    })?;

    let next_player = if status == "ongoing" { Some(yen.turn()) } else { None };

    Ok(Json(SessionMoveResponse {
        session_id: params.session_id,
        yen,
        status,
        winner,
        next_player,
    }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Plays the internal bot's turn and updates the session in DB.
/// Returns (updated_yen, status, winner, next_player).
async fn play_internal_bot_turn(
    state: &AppState,
    db: &mongodb::Database,
    session_id: &str,
    yen: YEN,
    internal_bot_id: &str,
    api_version: &str,
) -> Result<(YEN, String, Option<u32>, Option<u32>), Json<ErrorResponse>> {
    let bot = state.bots().find(internal_bot_id).ok_or_else(|| {
        Json(ErrorResponse::error(
            &format!("Internal bot not found: {}", internal_bot_id),
            Some(api_version.to_string()),
            None,
        ))
    })?;

    let mut game = GameY::try_from(yen).map_err(|e| {
        Json(ErrorResponse::error(&e.to_string(), Some(api_version.to_string()), None))
    })?;

    if let Some(coords) = bot.choose_move(&game) {
        let bot_player = PlayerId::new(game.next_player().map(|p| p.id()).unwrap_or(1));
        game.add_move(Movement::Placement { player: bot_player, coords }).map_err(|e| {
            Json(ErrorResponse::error(
                &format!("Bot move error: {}", e),
                Some(api_version.to_string()),
                None,
            ))
        })?;
    }

    let updated_yen: YEN = (&game).into();
    let (status, winner) = game_status_tuple(game.status());
    let next_player = if status == "ongoing" { Some(updated_yen.turn()) } else { None };

    // Update DB
    if let Ok(mut record) = db::get_session(db, session_id).await {
        if let Some(ref mut r) = record {
            r.yen_json = serde_json::to_string(&updated_yen).unwrap_or_default();
            r.status = status.clone();
            r.winner = winner;
            let _ = db::update_session(db, r).await;
        }
    }

    Ok((updated_yen, status, winner, next_player))
}

/// Converts a GameStatus reference to (status_str, winner_id).
fn game_status_tuple(status: &GameStatus) -> (String, Option<u32>) {
    match status {
        GameStatus::Finished { winner } => ("finished".to_string(), Some(winner.id())),
        GameStatus::Ongoing { .. } => ("ongoing".to_string(), None),
    }
}

#[cfg(test)]
    mod tests {
        use super::*;
        use crate::{GameStatus, PlayerId, core::game::Variant, YBotRegistry, RandomBot, state::AppState};
        use mongodb::Client;
        use std::sync::Arc;

        // ── game_status_tuple ──────────────────────────────────────────────────

        #[test]
        fn test_game_status_tuple_ongoing() {
            let status = GameStatus::Ongoing {
                next_player: PlayerId::new(0),
            };
            let (status_str, winner) = game_status_tuple(&status);
            assert_eq!(status_str, "ongoing");
            assert_eq!(winner, None);
        }

        #[test]
        fn test_game_status_tuple_finished_player0() {
            let status = GameStatus::Finished {
                winner: PlayerId::new(0),
            };
            let (status_str, winner) = game_status_tuple(&status);
            assert_eq!(status_str, "finished");
            assert_eq!(winner, Some(0));
        }

        #[test]
        fn test_game_status_tuple_finished_player1() {
            let status = GameStatus::Finished {
                winner: PlayerId::new(1),
            };
            let (status_str, winner) = game_status_tuple(&status);
            assert_eq!(status_str, "finished");
            assert_eq!(winner, Some(1));
        }

        // ── CreateSessionRequest defaults ─────────────────────────────────────

        #[test]
        fn test_create_session_request_default_variant() {
            let json = r#"{
            "board_size": 7,
            "external_player": 0,
            "internal_bot_id": "random_bot"
        }"#;
            let req: CreateSessionRequest = serde_json::from_str(json).unwrap();
            assert_eq!(req.variant, "standard");
            assert_eq!(req.board_size, 7);
            assert_eq!(req.external_player, 0);
            assert_eq!(req.internal_bot_id, "random_bot");
        }

        #[test]
        fn test_create_session_request_explicit_variant() {
            let json = r#"{
            "board_size": 5,
            "variant": "why_not",
            "external_player": 1,
            "internal_bot_id": "side_bot"
        }"#;
            let req: CreateSessionRequest = serde_json::from_str(json).unwrap();
            assert_eq!(req.variant, "why_not");
            assert_eq!(req.external_player, 1);
        }

        #[test]
        fn test_create_session_request_default_external_player() {
            let json = r#"{
            "board_size": 5,
            "internal_bot_id": "random_bot"
        }"#;
            let req: CreateSessionRequest = serde_json::from_str(json).unwrap();
            assert_eq!(req.external_player, 0);
        }

        // ── SessionMoveRequest deserialization ────────────────────────────────

        #[test]
        fn test_session_move_request_deserialization() {
            let json = r#"{"x": 2, "y": 1, "z": 1}"#;
            let req: SessionMoveRequest = serde_json::from_str(json).unwrap();
            assert_eq!(req.x, 2);
            assert_eq!(req.y, 1);
            assert_eq!(req.z, 1);
        }

        // ── CreateSessionResponse serialization ───────────────────────────────

        #[test]
        fn test_create_session_response_serialization_ongoing() {
            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let response = CreateSessionResponse {
                session_id: "abc-123".to_string(),
                yen,
                external_player: 0,
                internal_bot_id: "random_bot".to_string(),
                status: "ongoing".to_string(),
                winner: None,
                next_player: Some(0),
            };

            let json = serde_json::to_string(&response).unwrap();
            assert!(json.contains("\"session_id\":\"abc-123\""));
            assert!(json.contains("\"status\":\"ongoing\""));
            assert!(json.contains("\"winner\":null"));
            assert!(json.contains("\"next_player\":0"));
        }

        #[test]
        fn test_create_session_response_serialization_finished() {
            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let response = CreateSessionResponse {
                session_id: "xyz-456".to_string(),
                yen,
                external_player: 1,
                internal_bot_id: "side_bot".to_string(),
                status: "finished".to_string(),
                winner: Some(0),
                next_player: None,
            };

            let json = serde_json::to_string(&response).unwrap();
            assert!(json.contains("\"status\":\"finished\""));
            assert!(json.contains("\"winner\":0"));
            assert!(json.contains("\"next_player\":null"));
        }

        // ── SessionMoveResponse serialization ─────────────────────────────────

        #[test]
        fn test_session_move_response_serialization() {
            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let response = SessionMoveResponse {
                session_id: "abc-123".to_string(),
                yen,
                status: "ongoing".to_string(),
                winner: None,
                next_player: Some(1),
            };

            let json = serde_json::to_string(&response).unwrap();
            assert!(json.contains("\"session_id\":\"abc-123\""));
            assert!(json.contains("\"status\":\"ongoing\""));
            assert!(json.contains("\"winner\":null"));
            assert!(json.contains("\"next_player\":1"));
        }

        // ── SessionStateResponse serialization ────────────────────────────────

        #[test]
        fn test_session_state_response_serialization() {
            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let response = SessionStateResponse {
                session_id: "abc-123".to_string(),
                yen,
                external_player: 0,
                internal_bot_id: "random_bot".to_string(),
                status: "ongoing".to_string(),
                winner: None,
                next_player: Some(0),
            };

            let json = serde_json::to_string(&response).unwrap();
            assert!(json.contains("\"external_player\":0"));
            assert!(json.contains("\"internal_bot_id\":\"random_bot\""));
            assert!(json.contains("\"status\":\"ongoing\""));
        }

        // ── Variant parsing ───────────────────────────────────────────────────

        #[test]
        fn test_variant_standard_parsing() {
            let variant = match "standard" {
                "why_not" => Variant::WhyNot,
                _ => Variant::Standard,
            };
            assert_eq!(variant, Variant::Standard);
        }

        #[test]
        fn test_variant_why_not_parsing() {
            let variant = match "why_not" {
                "why_not" => Variant::WhyNot,
                _ => Variant::Standard,
            };
            assert_eq!(variant, Variant::WhyNot);
        }

        #[test]
        fn test_variant_unknown_defaults_to_standard() {
            let variant = match "desconocida" {
                "why_not" => Variant::WhyNot,
                _ => Variant::Standard,
            };
            assert_eq!(variant, Variant::Standard);
        }

        #[tokio::test]
        async fn test_play_internal_bot_turn_bot_not_found() {
            let registry = YBotRegistry::new();
            let state = AppState::new(registry);

            let client = Client::with_uri_str("mongodb://127.0.0.1:27017").await.unwrap();
            let db = client.database("gamey_tests");

            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let result = super::play_internal_bot_turn(
                &state,
                &db,
                "session-missing",
                yen,
                "nonexistent_bot",
                "v1",
            )
            .await;

            assert!(result.is_err());
            let err = result.err().unwrap().0;
            assert!(err.message.contains("Internal bot not found"));
            assert_eq!(err.api_version, Some("v1".to_string()));
        }

        #[tokio::test]
        async fn test_play_internal_bot_turn_with_random_bot() {
            let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));
            let state = AppState::new(registry);

            let client = Client::with_uri_str("mongodb://127.0.0.1:27017").await.unwrap();
            let db = client.database("gamey_tests");

            let game = GameY::new(5, Variant::Standard);
            let yen: YEN = (&game).into();

            let (updated_yen, status, winner, next_player) = super::play_internal_bot_turn(
                &state,
                &db,
                "session-ok",
                yen,
                "random_bot",
                "v1",
            )
            .await
            .expect("play_internal_bot_turn should succeed");

            assert!(status == "ongoing" || status == "finished");
            assert!(updated_yen.size() == 5);
            if status == "finished" {
                assert!(winner.is_some());
                assert!(next_player.is_none());
            }
        }
}
