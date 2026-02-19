use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, ServerApi, ServerApiVersion},
    Client, Database,
};
use serde::{Deserialize, Serialize};
use std::env;

/// Connects to the MongoDB database using the provided credentials.
/// Reads the password from the `MONGODB_PASSWORD` environment variable.
pub async fn connect() -> mongodb::error::Result<Database> {
    let password = env::var("MONGODB_PASSWORD").expect("MONGODB_PASSWORD must be set");
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

/// Generic function to save a document to a specific collection.
pub async fn save_document(db: &Database, collection_name: &str, doc: Document) -> mongodb::error::Result<()> {
    let collection = db.collection::<Document>(collection_name);
    collection.insert_one(doc).await?;
    Ok(())
}
