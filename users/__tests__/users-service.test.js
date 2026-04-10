
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
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

function createRankingCollection() {
  const memory = []
  const api = {
    updateOne: async (query, update) => {
      const user = memory.find(u => u.username === query.username)
      if (!user) {
        return { matchedCount: 0 }
      }
      if (update.$inc && typeof update.$inc.wins === 'number') {
        user.wins = (user.wins ?? 0) + update.$inc.wins
      }
      if (update.$inc && typeof update.$inc.losses === 'number') {
        user.losses = (user.losses ?? 0) + update.$inc.losses
      }
      return { matchedCount: 1 }
    },
    find: () => ({
      sort: () => ({
        toArray: async () => {
          const copy = memory.map(u => ({ ...u }))
          copy.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0))
          return copy
        }
      })
    })
  }
  return { api, memory }
}

describe('ranking endpoints', () => {
  let mem

  beforeEach(() => {
    mem = createRankingCollection()
    app.locals.usersCollection = mem.api
  })

  afterEach(() => {
    app.locals.usersCollection = undefined
  })

  it('records a win and returns ranking with updated stats', async () => {
    mem.memory.push({ username: 'alice', wins: 0, losses: 0 })

    const resResult = await request(app)
      .post('/game/result')
      .send({ username: 'alice', won: true })
      .set('Accept', 'application/json')

    expect(resResult.status).toBe(200)
    expect(resResult.body).toHaveProperty('message', 'Result recorded')

    const resRanking = await request(app)
      .get('/ranking')
      .set('Accept', 'application/json')

    expect(resRanking.status).toBe(200)
    expect(Array.isArray(resRanking.body.ranking)).toBe(true)
    const entry = resRanking.body.ranking.find(p => p.username === 'alice')
    expect(entry).toBeTruthy()
    expect(entry.wins).toBe(1)
    expect(entry.losses).toBe(0)
    expect(entry.winRate).toBe(100)
  })

  it('returns 404 when recording result for unknown user', async () => {
    const res = await request(app)
      .post('/game/result')
      .send({ username: 'bob', won: true })
      .set('Accept', 'application/json')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error')
  })

  it('validates request body for game result', async () => {
    const res = await request(app)
      .post('/game/result')
      .send({ username: 'charlie' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
