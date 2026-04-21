use futures::stream::TryStreamExt;
use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, ServerApi, ServerApiVersion},
    Client, Database,
};
use serde::{Deserialize, Serialize};
use std::{env, io};

/// Connects to the MongoDB database using the provided credentials.
/// Reads the password from the `MONGODB_PASSWORD` environment variable.
pub async fn connect() -> mongodb::error::Result<Database> {
    let password = env::var("MONGODB_PASSWORD")
        .map_err(|_| io::Error::new(io::ErrorKind::NotFound, "MONGODB_PASSWORD not set"))?;
    let uri = format!(
        "mongodb+srv://yovi2c_db_user:{}@yovi2c.yt6wilm.mongodb.net/?appName=Yovi2C&tls=true&tlsInsecure=true",
        password
    );

    let mut client_options = ClientOptions::parse(&uri).await?;

    // Set the server_api field of the client_options object to set the version of the Stable API on the client
    let server_api = ServerApi::builder().version(ServerApiVersion::V1).build();
    client_options.server_api = Some(server_api);

    // Get a handle to the cluster
    let client = Client::with_options(client_options)?;

    // Ping the server to see if you can connect to the cluster
    // (This might fail if network is restricted, but usually fine)
    match client
        .database("admin")
        .run_command(doc! {"ping": 1})
        .await {
        Ok(_) => println!("Pinged your deployment. You successfully connected to MongoDB!"),
        Err(e) => eprintln!("Failed to ping MongoDB: {}", e),
    }

    // Return the handle to the specific database for the app
    Ok(client.database("yovi2c_db"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameRecord {
    pub username: Option<String>,
    pub winner: Option<String>, // "Player 1", "Player 2", or None (Draw)
    pub board_size: u32,
    pub moves_count: usize,
    pub timestamp: i64, // Unix timestamp
    pub duration_seconds: u64, // Duration of the game in seconds
}

/// Saves a game record to the "games" collection.
pub async fn save_game_result(db: &Database, record: GameRecord) -> mongodb::error::Result<()> {
    let collection = db.collection::<GameRecord>("games");
    collection.insert_one(record).await?;
    println!("Game record saved successfully!");
    Ok(())
}

pub async fn list_recent_games(
    db: &Database,
    limit: i64,
) -> mongodb::error::Result<Vec<GameRecord>> {
    let collection = db.collection::<GameRecord>("games");
    let mut cursor = collection.find(doc! {}).await?;
    let mut games = Vec::new();
    while let Some(doc) = cursor.try_next().await? {
        games.push(doc);
    }
    Ok(sort_and_truncate(games, limit))
}

pub async fn list_recent_games_by_username(
    db: &Database,
    username: &str,
    limit: i64,
) -> mongodb::error::Result<Vec<GameRecord>> {
    let collection = db.collection::<GameRecord>("games");
    let mut cursor = collection.find(doc! { "username": username }).await?;
    let mut games = Vec::new();
    while let Some(doc) = cursor.try_next().await? {
        games.push(doc);
    }
    Ok(sort_and_truncate(games, limit))
}

/// Generic function to save a document to a specific collection.
pub async fn save_document(db: &Database, collection_name: &str, doc: Document) -> mongodb::error::Result<()> {
    let collection = db.collection::<Document>(collection_name);
    collection.insert_one(doc).await?;
    Ok(())
}

fn sort_and_truncate(mut games: Vec<GameRecord>, limit: i64) -> Vec<GameRecord> {
    games.sort_by_key(|g| g.timestamp);
    games.reverse();
    if limit >= 0 && games.len() as i64 > limit {
        games.truncate(limit as usize);
    }
    games
}

//Para la API
use uuid::Uuid;

/// A game session between an external bot and an internal bot.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionRecord {
    /// Unique session identifier.
    pub session_id: String,
    /// Current game state in YEN format (serialized as JSON string).
    pub yen_json: String,
    /// Which player (0 or 1) the external bot controls.
    pub external_player: u32,
    /// Which internal bot to play against.
    pub internal_bot_id: String,
    /// "ongoing" or "finished".
    pub status: String,
    /// Winner player id if finished.
    pub winner: Option<u32>,
    /// Unix timestamp when the session was created.
    pub created_at: i64,
}

/// Creates a new session in the database and returns its ID.
pub async fn create_session(db: &Database, record: SessionRecord) -> mongodb::error::Result<String> {
    let collection = db.collection::<SessionRecord>("sessions");
    collection.insert_one(record.clone()).await?;
    Ok(record.session_id)
}

/// Retrieves a session by its ID.
pub async fn get_session(db: &Database, session_id: &str) -> mongodb::error::Result<Option<SessionRecord>> {
    let collection = db.collection::<SessionRecord>("sessions");
    let result = collection.find_one(doc! { "session_id": session_id }).await?;
    Ok(result)
}

/// Updates an existing session.
pub async fn update_session(db: &Database, record: &SessionRecord) -> mongodb::error::Result<()> {
    let collection = db.collection::<SessionRecord>("sessions");
    let yen_json = record.yen_json.clone();
    let status = record.status.clone();
    let winner = record.winner;
    collection.update_one(
        doc! { "session_id": &record.session_id },
        doc! { "$set": {
            "yen_json": yen_json,
            "status": status,
            "winner": winner.map(|w| w as i64),
        }},
    ).await?;
    Ok(())
}

/// Generates a new unique session ID.
pub fn new_session_id() -> String {
    Uuid::new_v4().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_record(ts: i64, winner: Option<&str>) -> GameRecord {
        GameRecord {
            username: Some("alice".to_string()),
            winner: winner.map(|w| w.to_string()),
            board_size: 7,
            moves_count: 10,
            timestamp: ts,
            duration_seconds: 30,
        }
    }

    #[test]
    fn sort_and_truncate_keeps_order_desc_by_timestamp() {
        let r1 = make_record(100, Some("A"));
        let r2 = make_record(200, Some("B"));
        let r3 = make_record(150, Some("C"));

        let sorted = sort_and_truncate(vec![r1, r2, r3], 10);

        assert_eq!(sorted.len(), 3);
        assert!(sorted[0].timestamp >= sorted[1].timestamp);
        assert!(sorted[1].timestamp >= sorted[2].timestamp);
    }

    #[test]
    fn sort_and_truncate_applies_limit() {
        let r1 = make_record(100, None);
        let r2 = make_record(200, None);
        let r3 = make_record(300, None);

        let limited = sort_and_truncate(vec![r1, r2, r3], 2);

        assert_eq!(limited.len(), 2);
        assert!(limited[0].timestamp >= limited[1].timestamp);
    }

    #[test]
    fn sort_and_truncate_with_negative_limit_keeps_all() {
        let r1 = make_record(100, None);
        let r2 = make_record(200, None);

        let all = sort_and_truncate(vec![r1, r2], -1);

        assert_eq!(all.len(), 2);
    }

    #[test]
    fn game_record_serde_roundtrip() {
        let original = GameRecord {
            username: Some("alice".to_string()),
            winner: Some("Player 1".to_string()),
            board_size: 9,
            moves_count: 42,
            timestamp: 1_700_000_000,
            duration_seconds: 120,
        };

        let json = serde_json::to_string(&original).unwrap();
        let restored: GameRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.username, original.username);
        assert_eq!(restored.winner, original.winner);
        assert_eq!(restored.board_size, original.board_size);
        assert_eq!(restored.moves_count, original.moves_count);
        assert_eq!(restored.timestamp, original.timestamp);
        assert_eq!(restored.duration_seconds, original.duration_seconds);
    }
    #[test]
    fn sort_and_truncate_with_zero_limit_returns_empty() {
        let r1 = make_record(100, Some("A"));
        let r2 = make_record(200, Some("B"));

        let limited = sort_and_truncate(vec![r1, r2], 0);

        assert!(limited.is_empty());
    }

    #[test]
    fn sort_and_truncate_with_exact_limit_keeps_all() {
        let r1 = make_record(100, Some("A"));
        let r2 = make_record(200, Some("B"));

        let limited = sort_and_truncate(vec![r1, r2], 2);

        assert_eq!(limited.len(), 2);
        assert_eq!(limited[0].timestamp, 200);
        assert_eq!(limited[1].timestamp, 100);
    }

    #[test]
    fn sort_and_truncate_with_empty_vec_returns_empty() {
        let result = sort_and_truncate(Vec::new(), 5);
        assert!(result.is_empty());
    }

    #[test]
    fn sort_and_truncate_with_same_timestamps_does_not_crash() {
        let r1 = make_record(100, Some("A"));
        let r2 = make_record(100, Some("B"));
        let r3 = make_record(100, Some("C"));

        let result = sort_and_truncate(vec![r1, r2, r3], 10);

        assert_eq!(result.len(), 3);
        assert!(result.iter().all(|r| r.timestamp == 100));
    }

    #[test]
    fn game_record_serde_roundtrip_with_none_winner() {
        let original = GameRecord {
            username: Some("alice".to_string()),
            winner: None,
            board_size: 5,
            moves_count: 12,
            timestamp: 123456789,
            duration_seconds: 55,
        };

        let json = serde_json::to_string(&original).unwrap();
        let restored: GameRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.username, original.username);
        assert_eq!(restored.winner, None);
        assert_eq!(restored.board_size, 5);
        assert_eq!(restored.moves_count, 12);
        assert_eq!(restored.timestamp, 123456789);
        assert_eq!(restored.duration_seconds, 55);
    }

    #[test]
    fn session_record_serde_roundtrip_ongoing() {
        let original = SessionRecord {
            session_id: "session-123".to_string(),
            yen_json: r#"{"size":3,"turn":0,"players":["B","R"],"layout":"./../...","variant":"standard"}"#.to_string(),
            external_player: 1,
            internal_bot_id: "random".to_string(),
            status: "ongoing".to_string(),
            winner: None,
            created_at: 1_700_000_000,
        };

        let json = serde_json::to_string(&original).unwrap();
        let restored: SessionRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.session_id, original.session_id);
        assert_eq!(restored.yen_json, original.yen_json);
        assert_eq!(restored.external_player, original.external_player);
        assert_eq!(restored.internal_bot_id, original.internal_bot_id);
        assert_eq!(restored.status, original.status);
        assert_eq!(restored.winner, original.winner);
        assert_eq!(restored.created_at, original.created_at);
    }

    #[test]
    fn session_record_serde_roundtrip_finished_with_winner() {
        let original = SessionRecord {
            session_id: "session-finished".to_string(),
            yen_json: "{}".to_string(),
            external_player: 0,
            internal_bot_id: "center".to_string(),
            status: "finished".to_string(),
            winner: Some(1),
            created_at: 1_800_000_000,
        };

        let json = serde_json::to_string(&original).unwrap();
        let restored: SessionRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.session_id, original.session_id);
        assert_eq!(restored.yen_json, original.yen_json);
        assert_eq!(restored.external_player, original.external_player);
        assert_eq!(restored.internal_bot_id, original.internal_bot_id);
        assert_eq!(restored.status, original.status);
        assert_eq!(restored.winner, Some(1));
        assert_eq!(restored.created_at, original.created_at);
    }

    #[test]
    fn session_record_clone_preserves_fields() {
        let original = SessionRecord {
            session_id: "session-123".to_string(),
            yen_json: "{}".to_string(),
            external_player: 1,
            internal_bot_id: "random".to_string(),
            status: "ongoing".to_string(),
            winner: None,
            created_at: 1_700_000_000,
        };

        let cloned = original.clone();

        assert_eq!(cloned.session_id, original.session_id);
        assert_eq!(cloned.yen_json, original.yen_json);
        assert_eq!(cloned.external_player, original.external_player);
        assert_eq!(cloned.internal_bot_id, original.internal_bot_id);
        assert_eq!(cloned.status, original.status);
        assert_eq!(cloned.winner, original.winner);
        assert_eq!(cloned.created_at, original.created_at);
    }

    #[test]
    fn session_record_debug_contains_struct_name() {
        let record = SessionRecord {
            session_id: "session-123".to_string(),
            yen_json: "{}".to_string(),
            external_player: 1,
            internal_bot_id: "random".to_string(),
            status: "ongoing".to_string(),
            winner: None,
            created_at: 1_700_000_000,
        };

        let debug_text = format!("{:?}", record);

        assert!(debug_text.contains("SessionRecord"));
    }

    #[test]
    fn new_session_id_returns_non_empty_string() {
        let id = new_session_id();
        assert!(!id.is_empty());
    }

    #[test]
    fn new_session_id_returns_valid_uuid() {
        let id = new_session_id();
        assert!(Uuid::parse_str(&id).is_ok());
    }

    #[test]
    fn new_session_id_generates_different_values() {
        let id1 = new_session_id();
        let id2 = new_session_id();

        assert_ne!(id1, id2);
    }

    #[test]
    fn new_session_id_has_uuid_hyphenated_format() {
        let id = new_session_id();

        assert_eq!(id.len(), 36);
        assert_eq!(id.chars().nth(8), Some('-'));
        assert_eq!(id.chars().nth(13), Some('-'));
        assert_eq!(id.chars().nth(18), Some('-'));
        assert_eq!(id.chars().nth(23), Some('-'));
    }

}
