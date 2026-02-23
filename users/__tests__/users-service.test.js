import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'

// ── Mock MongoDB ANTES de importar la app ──────────────────────────────────
vi.mock('mongodb', () => {
    const findOne = vi.fn().mockResolvedValue(null);        // usuario no existe
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn().mockReturnValue({ findOne, insertOne });
    const db = vi.fn().mockReturnValue({ collection });
    const connect = vi.fn().mockResolvedValue(undefined);
    const MongoClient = vi.fn().mockReturnValue({ connect, db });
    return { MongoClient };
});

import app from '../users-service.js'

describe('POST /createuser', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns a greeting message for the provided username', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Pablo/i)
    })
})