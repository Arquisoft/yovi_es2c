import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

process.env.NODE_ENV = 'test'

vi.mock('mongodb', () => {
  const connect = vi.fn().mockResolvedValue(undefined)
  const collection = vi.fn()
  const db = vi.fn().mockReturnValue({ collection })
  const MongoClient = vi.fn().mockReturnValue({ connect, db })
  return { MongoClient }
})

import app from '../users-service.js'

describe('users service extra coverage', () => {
  beforeEach(() => {
    app.locals.usersCollection = undefined
  })

  afterEach(() => {
    app.locals.usersCollection = undefined
    vi.restoreAllMocks()
  })

  it('returns 204 for CORS preflight requests', async () => {
    const res = await request(app).options('/register')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('*')
    expect(res.headers['access-control-allow-methods']).toContain('OPTIONS')
  })

  it('validates username and password before registration', async () => {
    const noUsername = await request(app).post('/register').send({ username: '   ', password: '123456' })
    expect(noUsername.status).toBe(400)
    expect(noUsername.body).toEqual({ error: 'Username is required' })

    const shortPassword = await request(app).post('/register').send({ username: 'alice', password: '123' })
    expect(shortPassword.status).toBe(400)
    expect(shortPassword.body).toEqual({ error: 'Password must be at least 6 characters' })
  })

  it('returns 500 when register is called without database initialization', async () => {
    const res = await request(app).post('/register').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Database not initialized' })
  })

  it('returns 409 when registering an existing username', async () => {
    app.locals.usersCollection = {
      findOne: vi.fn().mockResolvedValue({ username: 'alice' }),
    }

    const res = await request(app).post('/register').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'Username already exists' })
  })

  it('surfaces persistence errors during registration', async () => {
    app.locals.usersCollection = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockRejectedValue(new Error('insert failed')),
    }

    const res = await request(app).post('/register').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'insert failed' })
  })

  it('returns 500 when login is called without database initialization', async () => {
    const res = await request(app).post('/login').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Database not initialized' })
  })

  it('rejects login for unknown users and incomplete credentials', async () => {
    app.locals.usersCollection = {
      findOne: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ username: 'alice', passwordHash: null, passwordSalt: 'salt' }),
    }

    const unknown = await request(app).post('/login').send({ username: 'alice', password: '123456' })
    expect(unknown.status).toBe(401)
    expect(unknown.body).toEqual({ error: 'Invalid username or password' })

    const incomplete = await request(app).post('/login').send({ username: 'alice', password: '123456' })
    expect(incomplete.status).toBe(401)
    expect(incomplete.body).toEqual({ error: 'Invalid username or password' })
  })

  it('returns 401 when password hash does not match', async () => {
    const passwordSalt = 'abcdabcdabcdabcdabcdabcdabcdabcd'
    const wrongHash = '00'.repeat(64)
    app.locals.usersCollection = {
      findOne: vi.fn().mockResolvedValue({ username: 'alice', passwordHash: wrongHash, passwordSalt }),
    }

    const res = await request(app).post('/login').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid username or password' })
  })

  it('returns 500 when login lookup fails', async () => {
    app.locals.usersCollection = {
      findOne: vi.fn().mockRejectedValue(new Error('lookup failed')),
    }

    const res = await request(app).post('/login').send({ username: 'alice', password: '123456' })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'lookup failed' })
  })

  it('supports the legacy createuser alias', async () => {
    app.locals.usersCollection = {
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    }

    const res = await request(app).post('/createuser').send({ username: 'legacy', password: '123456' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ message: 'User registered successfully', username: 'legacy' })
  })

  it('returns 500 when ranking is requested without database initialization', async () => {
    const res = await request(app).get('/ranking')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Database not initialized' })
  })

  it('normalizes ranking values and handles users with no games', async () => {
    app.locals.usersCollection = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { username: 'alice', wins: 3, losses: 1 },
            { username: 'bob' },
          ]),
        }),
      }),
    }

    const res = await request(app).get('/ranking')

    expect(res.status).toBe(200)
    expect(res.body.ranking).toEqual([
      { position: 1, username: 'alice', wins: 3, losses: 1, winRate: 75 },
      { position: 2, username: 'bob', wins: 0, losses: 0, winRate: 0 },
    ])
  })

  it('returns 500 when ranking query fails', async () => {
    app.locals.usersCollection = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error('ranking failed')),
        }),
      }),
    }

    const res = await request(app).get('/ranking')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'ranking failed' })
  })

  it('returns 500 when recording results without database initialization', async () => {
    const res = await request(app).post('/game/result').send({ username: 'alice', won: true })

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'Database not initialized' })
  })

  it('records losses and handles update failures for game results', async () => {
    const updateOne = vi.fn()
      .mockResolvedValueOnce({ matchedCount: 1 })
      .mockRejectedValueOnce(new Error('update failed'))

    app.locals.usersCollection = { updateOne }

    const loss = await request(app).post('/game/result').send({ username: 'alice', won: false })
    expect(loss.status).toBe(200)
    expect(loss.body).toEqual({ message: 'Result recorded' })
    expect(updateOne).toHaveBeenNthCalledWith(1, { username: 'alice' }, { $inc: { losses: 1 } })

    const failing = await request(app).post('/game/result').send({ username: 'alice', won: true })
    expect(failing.status).toBe(500)
    expect(failing.body).toEqual({ error: 'update failed' })
  })
})
