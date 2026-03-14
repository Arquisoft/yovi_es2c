import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import request from 'supertest'

process.env.NODE_ENV = 'test'

vi.mock('mongodb', () => {
  const connect = vi.fn().mockResolvedValue(undefined)
  const collection = vi.fn().mockReturnValue({
    findOne: vi.fn(),
    insertOne: vi.fn()
  })
  const db = vi.fn().mockReturnValue({ collection })
  const MongoClient = vi.fn().mockReturnValue({ connect, db })
  return { MongoClient }
})

import app from '../users-service.js'

function createMemoryCollection() {
  const memory = []
  const api = {
    findOne: async (query) => {
      if (!query || typeof query.username !== 'string') return null
      return memory.find(u => u.username === query.username) || null
    },
    insertOne: async (doc) => {
      memory.push({ ...doc })
      return { acknowledged: true }
    }
  }
  return { api, memory }
}

describe('Users service DB flows (memory-backed)', () => {
  let mem

  beforeEach(() => {
    mem = createMemoryCollection()
    app.locals.usersCollection = mem.api
  })

  afterEach(() => {
    app.locals.usersCollection = undefined
  })

  it('registers a new user and persists hashed credentials', async () => {
    const res = await request(app)
      .post('/register')
      .send({ username: 'alice', password: 'secret123' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('username', 'alice')
    // Verify the in-memory insert captured hashed fields
    const stored = mem.memory.find(u => u.username === 'alice')
    expect(stored).toBeTruthy()
    expect(typeof stored.passwordSalt).toBe('string')
    expect(typeof stored.passwordHash).toBe('string')
    expect(stored.passwordSalt.length).toBeGreaterThan(0)
    expect(stored.passwordHash.length).toBeGreaterThan(0)
  })

  it('prevents duplicate usernames', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'bob', password: 'secret123' })
      .set('Accept', 'application/json')
      .expect(201)

    const res = await request(app)
      .post('/register')
      .send({ username: 'bob', password: 'anotherpass' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(409)
  })

  it('validates username and password on register', async () => {
    const res1 = await request(app)
      .post('/register')
      .send({ username: '   ', password: 'secret123' })
      .set('Accept', 'application/json')
    expect(res1.status).toBe(400)

    const res2 = await request(app)
      .post('/register')
      .send({ username: 'charlie', password: '123' })
      .set('Accept', 'application/json')
    expect(res2.status).toBe(400)
  })

  it('logs in with correct credentials after register', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'dana', password: 'secret123' })
      .set('Accept', 'application/json')
      .expect(201)

    const res = await request(app)
      .post('/login')
      .send({ username: 'dana', password: 'secret123' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('username', 'dana')
  })

  it('rejects login with wrong password', async () => {
    await request(app)
      .post('/register')
      .send({ username: 'erin', password: 'secret123' })
      .set('Accept', 'application/json')
      .expect(201)

    const res = await request(app)
      .post('/login')
      .send({ username: 'erin', password: 'wrongpass' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(401)
  })

  it('fails gracefully when DB not initialized', async () => {
    app.locals.usersCollection = undefined
    const res = await request(app)
      .post('/register')
      .send({ username: 'zoe', password: 'secret123' })
      .set('Accept', 'application/json')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

