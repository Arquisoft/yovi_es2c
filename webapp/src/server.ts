import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI!);

async function main() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('yovic_db');
        const usersCollection = db.collection('users');

        app.post('/createuser', async (req, res) => {
            const { username } = req.body;
            if (!username || username.trim() === '') {
                return res.status(400).json({ error: 'Username is required' });
            }

            const existingUser = await usersCollection.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            await usersCollection.insertOne({ username, createdAt: new Date() });
            res.json({ message: `User ${username} created successfully!` });
        });

        app.listen(process.env.PORT, () => {
            console.log(`Server running on http://localhost:${process.env.PORT}`);
        });
    } catch (err) {
        console.error(err);
    }
}

main();