import express from "express";
import cors from "cors";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// ⚡ ES Modules: obtener __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carga variables de entorno
dotenv.config({ path: resolve(__dirname, ".env") });

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.MONGO_DB;
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_CLUSTER = process.env.MONGO_CLUSTER;

if (!DB_NAME || !MONGO_USER || !MONGO_PASSWORD || !MONGO_CLUSTER) {
    throw new Error("❌ Falta alguna variable de entorno de MongoDB en .env");
}

// Construimos la URI con encodeURIComponent para manejar caracteres especiales
const MONGO_URI = `mongodb://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD)}@cluster0-shard-00-00.yt6wilm.mongodb.net:27017,cluster0-shard-00-01.yt6wilm.mongodb.net:27017,cluster0-shard-00-02.yt6wilm.mongodb.net:27017/${DB_NAME}?ssl=true&replicaSet=atlas-xxxxxx-shard-0&authSource=admin&retryWrites=true&w=majority`;

const client = new MongoClient(MONGO_URI, {
    serverApi: ServerApiVersion.v1,
});

const app = express();
app.use(cors());
app.use(express.json());

async function main() {
    try {
        // Conexión al cluster
        await client.connect();

        // Ping para verificar conexión
        await client.db("admin").command({ ping: 1 });
        console.log("✅ Pinged MongoDB, connection successful");

        const db = client.db(DB_NAME);
        const usersCollection = db.collection("users");

        // Ruta para crear usuario
        app.post("/createuser", async (req, res) => {
            const { username } = req.body;

            if (!username || username.trim() === "") {
                return res.status(400).json({ error: "Username is required" });
            }

            const existingUser = await usersCollection.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: "Username already exists" });
            }

            await usersCollection.insertOne({ username, createdAt: new Date() });
            res.json({ message: `User ${username} created successfully!` });
        });

        app.listen(PORT, () => {
            console.log(`🌐 Server running at http://localhost:${PORT}`);
        });
    } catch (err: any) {
        console.error("❌ Error conectando a MongoDB:", err.message);
        console.error(err.stack);
    }
}

main();