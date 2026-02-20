const express = require('express');
require('dotenv').config();
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);

let usersCollection;

async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('yovi2c_db');
    usersCollection = db.collection('users');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

connectToMongo();

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!usersCollection) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await usersCollection.insertOne({ username, createdAt: new Date() });
    res.json({ message: `User ${username} created successfully!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
