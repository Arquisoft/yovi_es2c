//! Game management endpoint for the Y game server.
//!
//! This module provides an HTTP endpoint for making moves in a Y game.
//! It accepts a game state in YEN format plus coordinates, applies the move,
//! and returns the updated game state along with win/ongoing status.
//!
//! # Route
//! `POST /{api_version}/game/move`
//!
//! # Example Request
//! ```json
//! {
//!   "yen": { "size": 3, "turn": 0, "players": ["B","R"], "layout": "../..." },
//!   "x": 1, "y": 1, "z": 1
//! }
//! ```
//!
//! # Example Response (ongoing)
//! ```json
//! {
//!   "yen": { ... updated state ... },
//!   "status": "ongoing",
//!   "winner": null,
//!   "next_player": 1
//! }
//! ```
//!
//! # Example Response (finished)
//! ```json
//! {
//!   "yen": { ... final state ... },
//!   "status": "finished",
//!   "winner": 0,
//!   "next_player": null
//! }
//! ```

use axum::{extract::Path, Json};
use serde::{Deserialize, Serialize};

use crate::{
    GameStatus, GameY, Movement, YEN,
    error::ErrorResponse,
    Coordinates, PlayerId,
    version::check_api_version,
};

/// Request body for the game move endpoint.
#[derive(Deserialize)]
pub struct GameMoveRequest {
    /// Current game state in YEN format.
    pub yen: YEN,
    /// X component of the barycentric coordinate to place a piece.
    pub x: u32,
    /// Y component of the barycentric coordinate to place a piece.
    pub y: u32,
    /// Z component of the barycentric coordinate to place a piece.
    pub z: u32,
}

/// Response returned after a successful game move.
#[derive(Serialize)]
pub struct GameMoveResponse {
    /// Updated game state in YEN format.
    pub yen: YEN,
    /// Either `"ongoing"` or `"finished"`.
    pub status: String,
    /// ID of the winning player (0 or 1), or `null` if the game is ongoing.
    pub winner: Option<u32>,
    /// ID of the player who should move next, or `null` if the game is finished.
    pub next_player: Option<u32>,
}

/// Handler for the game move endpoint.
///
/// Accepts a YEN game state and barycentric coordinates for the move,
/// validates the move, applies it, and returns the resulting state.
///
/// The player is determined automatically from the `turn` field of the YEN.
#[axum::debug_handler]
pub async fn make_move(
    Path(api_version): Path<String>,
    Json(req): Json<GameMoveRequest>,
) -> Result<Json<GameMoveResponse>, Json<ErrorResponse>> {
    check_api_version(&api_version)?;

    // Reconstruct the game from the provided YEN state
    let mut game = GameY::try_from(req.yen).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Invalid YEN format: {}", e),
            Some(api_version.clone()),
            None,
        ))
    })?;

    // The current player is derived from the game status (YEN turn field)
    let player = game.next_player().ok_or_else(|| {
        Json(ErrorResponse::error(
            "Game is already finished — no more moves allowed",
            Some(api_version.clone()),
            None,
        ))
    })?;

    let coords = Coordinates::new(req.x, req.y, req.z);
    let movement = Movement::Placement { player, coords };

    game.add_move(movement).map_err(|e| {
        Json(ErrorResponse::error(
            &format!("Illegal move: {}", e),
            Some(api_version.clone()),
            None,
        ))
    })?;

    let new_yen: YEN = (&game).into();

    let (status_str, winner, next_player) = match game.status() {
        GameStatus::Finished { winner } => {
            ("finished".to_string(), Some(winner.id()), None)
        }
        GameStatus::Ongoing { next_player } => {
            ("ongoing".to_string(), None, Some(next_player.id()))
        }
    };

    Ok(Json(GameMoveResponse {
        yen: new_yen,
        status: status_str,
        winner,
        next_player,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::YEN;

    fn empty_yen(size: u32) -> YEN {
        // Build an empty YEN layout: rows separated by '/'
        // Row r has r+1 dots
        let layout = (0..size)
            .map(|r| ".".repeat((r + 1) as usize))
            .collect::<Vec<_>>()
            .join("/");
        YEN::new(size, 0, vec!['B', 'R'], layout)
    }

    #[test]
    fn test_request_deserialization() {
        let json = r#"{
            "yen": {"size": 3, "turn": 0, "players": ["B","R"], "layout": "../..."},
            "x": 1, "y": 1, "z": 0
        }"#;
        let req: GameMoveRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.x, 1);
        assert_eq!(req.y, 1);
        assert_eq!(req.z, 0);
    }

    #[test]
    fn test_response_serialization_ongoing() {
        let yen = empty_yen(3);
        let response = GameMoveResponse {
            yen,
            status: "ongoing".to_string(),
            winner: None,
            next_player: Some(1),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"status\":\"ongoing\""));
        assert!(json.contains("\"winner\":null"));
        assert!(json.contains("\"next_player\":1"));
    }

    #[test]
    fn test_response_serialization_finished() {
        let yen = empty_yen(3);
        let response = GameMoveResponse {
            yen,
            status: "finished".to_string(),
            winner: Some(0),
            next_player: None,
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"status\":\"finished\""));
        assert!(json.contains("\"winner\":0"));
        assert!(json.contains("\"next_player\":null"));
    }
}