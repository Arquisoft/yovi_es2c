const express = require('express');
require('dotenv').config();
const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const { MongoClient } = require('mongodb');
const crypto = require('node:crypto');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);

async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('yovi2c_db');
    app.locals.usersCollection = db.collection('users');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

if (process.env.NODE_ENV !== 'test') {
  connectToMongo();
}

const metricsMiddleware = promBundle({ includeMethod: true });
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

const SCRYPT_KEYLEN = 64;

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey);
    });
  });
}

async function hashPassword(password, salt) {
  const derivedKey = await scryptAsync(password, salt);
  return derivedKey.toString('hex');
}

function getValidatedCredentials(req, res) {
  const username = req.body?.username?.trim();
  const password = req.body?.password;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return null;
  }

  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return null;
  }

  return { username, password };
}

async function registerHandler(req, res) {
  const credentials = getValidatedCredentials(req, res);
  if (!credentials) return;

  const usersCollection = req.app.locals.usersCollection;
  if (!usersCollection) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const { username, password } = credentials;

  try {
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordSalt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, passwordSalt);

    await usersCollection.insertOne({
      username,
      passwordHash,
      passwordSalt,
      createdAt: new Date(),
    });

    return res.status(201).json({ message: 'User registered successfully', username });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function loginHandler(req, res) {
  const credentials = getValidatedCredentials(req, res);
  if (!credentials) return;

  const usersCollection = req.app.locals.usersCollection;
  if (!usersCollection) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  const { username, password } = credentials;

  try {
    const user = await usersCollection.findOne({ username });
    if (!user || !user.passwordHash || !user.passwordSalt) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const computedHash = await hashPassword(password, user.passwordSalt);
    const validPassword = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return res.status(200).json({ message: 'Login successful', username: user.username });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ------------------- Rutas -------------------
app.post('/register', registerHandler);
app.post('/login', loginHandler);

// Alias de compatibilidad con versiones previas del frontend.
app.post('/createuser', registerHandler);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`);
  });
}

module.exports = app;
