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
            winner: Some("Player 1".to_string()),
            board_size: 9,
            moves_count: 42,
            timestamp: 1_700_000_000,
            duration_seconds: 120,
        };

        let json = serde_json::to_string(&original).unwrap();
        let restored: GameRecord = serde_json::from_str(&json).unwrap();

        assert_eq!(restored.winner, original.winner);
        assert_eq!(restored.board_size, original.board_size);
        assert_eq!(restored.moves_count, original.moves_count);
        assert_eq!(restored.timestamp, original.timestamp);
        assert_eq!(restored.duration_seconds, original.duration_seconds);
    }


}
