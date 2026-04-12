use axum::{extract::Path, Json};
use serde::Serialize;

use crate::{db, error::ErrorResponse, version::check_api_version};

#[derive(Serialize)]
pub struct HistoryGame {
    pub winner: Option<String>,
    pub board_size: u32,
    pub moves_count: usize,
    pub timestamp: i64,
    pub duration_seconds: u64,
}

#[derive(Serialize)]
pub struct HistoryResponse {
    pub api_version: String,
    pub games: Vec<HistoryGame>,
}

#[axum::debug_handler]
pub async fn history(
    Path(api_version): Path<String>,
) -> Result<Json<HistoryResponse>, Json<ErrorResponse>> {
    check_api_version(&api_version)?;

    let db = db::connect()
        .await
        .map_err(|e| Json(ErrorResponse::error(&e.to_string(), Some(api_version.clone()), None)))?;

    let records = db::list_recent_games(&db, 50)
        .await
        .map_err(|e| Json(ErrorResponse::error(&e.to_string(), Some(api_version.clone()), None)))?;

    let games = records
        .into_iter()
        .map(|r| HistoryGame {
            winner: r.winner,
            board_size: r.board_size,
            moves_count: r.moves_count,
            timestamp: r.timestamp,
            duration_seconds: r.duration_seconds,
        })
        .collect();

    Ok(Json(HistoryResponse {
        api_version,
        games,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::Path;

    #[test]
    fn history_response_serialization() {
        let game = HistoryGame {
            winner: Some("Alice".to_string()),
            board_size: 7,
            moves_count: 42,
            timestamp: 1_700_000_000,
            duration_seconds: 120,
        };

        let response = HistoryResponse {
            api_version: "v1".to_string(),
            games: vec![game],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"api_version\":\"v1\""));
        assert!(json.contains("\"winner\":\"Alice\""));
        assert!(json.contains("\"board_size\":7"));
        assert!(json.contains("\"moves_count\":42"));
        assert!(json.contains("\"duration_seconds\":120"));
    }

    #[tokio::test]
    async fn history_rejects_invalid_version() {
        let result = history(Path("v0".to_string())).await;
        assert!(result.is_err());
    }
}

