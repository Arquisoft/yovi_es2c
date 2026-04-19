//! Endpoint `/play` compatible con la especificación de la competición.
//!
//! Este endpoint es stateless: recibe un YEN y devuelve la jugada del bot.
//! No requiere sesión ni base de datos.
//!
//! # Route
//! `GET /play`
//!
//! # Query Parameters
//! - `position` (obligatorio): estado del juego en formato YEN (JSON)
//! - `bot_id` (opcional): identificador del bot. Por defecto usa `side_bot`.
//!
//! # Example
//! ```bash
//! curl -G "http://localhost:4000/play" \
//!   --data-urlencode 'position={"size":3,"turn":0,"players":["B","R"],"layout":"./B./...","variant":"standard"}'
//! ```
//!
//! # Example Response
//! ```json
//! {"coords":{"x":1,"y":1,"z":0}}
//! ```

use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};

use crate::{
    GameY, YEN,
    error::ErrorResponse,
    state::AppState,
};

/// Query parameters for the play endpoint.
#[derive(Deserialize)]
pub struct PlayParams {
    /// Current game state in YEN format (JSON string).
    pub position: String,
    /// Bot identifier. Defaults to "side_bot" if not specified.
    pub bot_id: Option<String>,
}

/// Coordinates of the chosen move.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct PlayCoords {
    pub x: u32,
    pub y: u32,
    pub z: u32,
}

/// Response from the play endpoint.
///
/// Can be either a placement move or a special action.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(untagged)]
pub enum PlayResponse {
    /// A placement move with barycentric coordinates.
    Move { coords: PlayCoords },
    /// A special action like "swap" or "resign".
    Action { action: String },
}

/// Handler for the play endpoint.
///
/// Receives a YEN position and returns the bot's chosen move.
/// This endpoint is stateless and does not require a session or database.
#[axum::debug_handler]
pub async fn play(
    State(state): State<AppState>,
    Query(params): Query<PlayParams>,
) -> Result<Json<PlayResponse>, Json<ErrorResponse>> {

    // Parse the YEN from the query parameter
    let yen: YEN = serde_json::from_str(&params.position).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid YEN format: {}", e),
            None,
            None,
        ))
    })?;

    // Use the requested bot or fall back to side_bot
    let bot_id = params.bot_id.as_deref().unwrap_or("side_bot");

    let bot = state.bots().find(bot_id).ok_or_else(|| {
        let available = state.bots().names().join(", ");
        Json(ErrorResponse::error(
            &format!("Bot not found: {}. Available: [{}]", bot_id, available),
            None,
            Some(bot_id.to_string()),
        ))
    })?;

    // Build the game from the YEN
    let game = GameY::try_from(yen).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid game state: {}", e),
            None,
            Some(bot_id.to_string()),
        ))
    })?;

    // Ask the bot to choose a move
    let coords = bot.choose_move(&game).ok_or_else(|| {
        Json(ErrorResponse::error(
            "No valid moves available",
            None,
            Some(bot_id.to_string()),
        ))
    })?;

    Ok(Json(PlayResponse::Move {
        coords: PlayCoords {
            x: coords.x(),
            y: coords.y(),
            z: coords.z(),
        },
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── PlayResponse serialization ────────────────────────────────────────────

    #[test]
    fn test_play_response_move_serialization() {
        let response = PlayResponse::Move {
            coords: PlayCoords { x: 1, y: 1, z: 0 },
        };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"coords":{"x":1,"y":1,"z":0}}"#);
    }

    #[test]
    fn test_play_response_action_swap_serialization() {
        let response = PlayResponse::Action {
            action: "swap".to_string(),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"action":"swap"}"#);
    }

    #[test]
    fn test_play_response_action_resign_serialization() {
        let response = PlayResponse::Action {
            action: "resign".to_string(),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(json, r#"{"action":"resign"}"#);
    }

    #[test]
    fn test_play_response_move_deserialization() {
        let json = r#"{"coords":{"x":2,"y":1,"z":1}}"#;
        let response: PlayResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response, PlayResponse::Move {
            coords: PlayCoords { x: 2, y: 1, z: 1 },
        });
    }

    #[test]
    fn test_play_response_action_deserialization() {
        let json = r#"{"action":"swap"}"#;
        let response: PlayResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response, PlayResponse::Action {
            action: "swap".to_string(),
        });
    }

    #[test]
    fn test_play_coords_equality() {
        let c1 = PlayCoords { x: 1, y: 2, z: 3 };
        let c2 = PlayCoords { x: 1, y: 2, z: 3 };
        let c3 = PlayCoords { x: 0, y: 0, z: 0 };
        assert_eq!(c1, c2);
        assert_ne!(c1, c3);
    }

    // ── PlayParams deserialization ────────────────────────────────────────────

    #[test]
    fn test_play_params_with_bot_id() {
        let params = PlayParams {
            position: r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./B./...","variant":"standard"}"#.to_string(),
            bot_id: Some("random_bot".to_string()),
        };
        assert_eq!(params.bot_id, Some("random_bot".to_string()));
    }

    #[test]
    fn test_play_params_without_bot_id() {
        let params = PlayParams {
            position: "{}".to_string(),
            bot_id: None,
        };
        // Default bot should be side_bot
        let bot_id = params.bot_id.as_deref().unwrap_or("side_bot");
        assert_eq!(bot_id, "side_bot");
    }

    // ── Integration: valid YEN + bot ──────────────────────────────────────────

    #[test]
    fn test_valid_yen_parses_correctly() {
        let yen_str = r#"{
            "size": 3,
            "turn": 0,
            "players": ["B", "R"],
            "layout": "../...",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        assert_eq!(yen.size(), 3);
        assert_eq!(yen.turn(), 0);
    }

    #[test]
    fn test_invalid_yen_returns_error() {
        let invalid = "not valid json";
        let result: Result<YEN, _> = serde_json::from_str(invalid);
        assert!(result.is_err());
    }

    #[test]
    fn test_play_response_clone() {
        let r = PlayResponse::Move {
            coords: PlayCoords { x: 1, y: 1, z: 1 },
        };
        let cloned = r.clone();
        assert_eq!(r, cloned);
    }

    // ── PlayCoords serialization ──────────────────────────────────────────────

    #[test]
    fn test_play_coords_serialization() {
        let coords = PlayCoords { x: 3, y: 1, z: 0 };
        let json = serde_json::to_string(&coords).unwrap();
        assert_eq!(json, r#"{"x":3,"y":1,"z":0}"#);
    }

    #[test]
    fn test_play_coords_deserialization() {
        let json = r#"{"x":0,"y":4,"z":0}"#;
        let coords: PlayCoords = serde_json::from_str(json).unwrap();
        assert_eq!(coords, PlayCoords { x: 0, y: 4, z: 0 });
    }

    #[test]
    fn test_play_coords_zero() {
        let coords = PlayCoords { x: 0, y: 0, z: 0 };
        let json = serde_json::to_string(&coords).unwrap();
        let decoded: PlayCoords = serde_json::from_str(&json).unwrap();
        assert_eq!(coords, decoded);
    }

    // ── PlayResponse roundtrip ────────────────────────────────────────────────

    #[test]
    fn test_play_response_move_roundtrip() {
        let original = PlayResponse::Move {
            coords: PlayCoords { x: 4, y: 0, z: 0 },
        };
        let json = serde_json::to_string(&original).unwrap();
        let decoded: PlayResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(original, decoded);
    }

    #[test]
    fn test_play_response_action_roundtrip() {
        let original = PlayResponse::Action {
            action: "resign".to_string(),
        };
        let json = serde_json::to_string(&original).unwrap();
        let decoded: PlayResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(original, decoded);
    }

    #[test]
    fn test_play_response_action_clone() {
        let r = PlayResponse::Action {
            action: "swap".to_string(),
        };
        let cloned = r.clone();
        assert_eq!(r, cloned);
    }

    #[test]
    fn test_play_response_move_ne_action() {
        let m = PlayResponse::Move {
            coords: PlayCoords { x: 1, y: 1, z: 1 },
        };
        let a = PlayResponse::Action {
            action: "swap".to_string(),
        };
        assert_ne!(m, a);
    }

    // ── YEN parsing edge cases ────────────────────────────────────────────────

    #[test]
    fn test_yen_size_5_parses() {
        let yen_str = r#"{
            "size": 5,
            "turn": 0,
            "players": ["B", "R"],
            "layout": "./../.../..../.....",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        assert_eq!(yen.size(), 5);
        assert_eq!(yen.turn(), 0);
    }

    #[test]
    fn test_yen_turn_1_parses() {
        let yen_str = r#"{
            "size": 3,
            "turn": 1,
            "players": ["B", "R"],
            "layout": "../...",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        assert_eq!(yen.turn(), 1);
    }

    #[test]
    fn test_yen_why_not_variant_parses() {
        let yen_str = r#"{
            "size": 3,
            "turn": 0,
            "players": ["B", "R"],
            "layout": "../...",
            "variant": "why_not"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        assert_eq!(yen.size(), 3);
    }

    #[test]
    fn test_empty_json_yen_fails() {
        let result: Result<YEN, _> = serde_json::from_str("{}");
        assert!(result.is_err());
    }

    #[test]
    fn test_yen_missing_layout_fails() {
        let result: Result<YEN, _> = serde_json::from_str(
            r#"{"size":3,"turn":0,"players":["B","R"],"variant":"standard"}"#
        );
        assert!(result.is_err());
    }

    // ── GameY::try_from YEN ───────────────────────────────────────────────────

    #[test]
    fn test_game_from_valid_yen() {
        let yen_str = r#"{
            "size": 5,
            "turn": 0,
            "players": ["B", "R"],
            "layout": "./../.../..../.....",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen);
        assert!(game.is_ok());
    }

    #[test]
    fn test_game_from_yen_turn_preserved() {
        let yen_str = r#"{
            "size": 5,
            "turn": 1,
            "players": ["B", "R"],
            "layout": "./../.../..../.....",
            "variant": "standard"
        }"#;
        let yen: YEN = serde_json::from_str(yen_str).unwrap();
        let game = GameY::try_from(yen).unwrap();
        let next = game.next_player().map(|p| p.id());
        assert_eq!(next, Some(1));
    }

    // ── PlayParams bot_id fallback ────────────────────────────────────────────

    #[test]
    fn test_bot_id_fallback_empty_string() {
        let params = PlayParams {
            position: "{}".to_string(),
            bot_id: Some("".to_string()),
        };
        let bot_id = params.bot_id.as_deref().unwrap_or("side_bot");
        assert_eq!(bot_id, "");
    }

    #[test]
    fn test_bot_id_custom_value() {
        let params = PlayParams {
            position: "{}".to_string(),
            bot_id: Some("side_bot_hard".to_string()),
        };
        let bot_id = params.bot_id.as_deref().unwrap_or("side_bot");
        assert_eq!(bot_id, "side_bot_hard");
    }
}