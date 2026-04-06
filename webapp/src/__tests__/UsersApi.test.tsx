import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRanking, recordGameResult } from '../UsersApi';

describe('UsersApi', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── fetchRanking ──────────────────────────────────────────────────────────

    describe('fetchRanking', () => {
        it('devuelve el ranking cuando la respuesta es ok', async () => {
            const mockRanking = [
                { position: 1, username: 'Alice', wins: 10, losses: 2, winRate: 83 },
                { position: 2, username: 'Bob', wins: 7, losses: 3, winRate: 70 },
            ];

            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ ranking: mockRanking }),
            } as Response);

            const result = await fetchRanking();

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/ranking')
            );
            expect(result).toEqual(mockRanking);
        });

        it('lanza error cuando la respuesta no es ok', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            await expect(fetchRanking()).rejects.toThrow('Could not fetch ranking');
        });

        it('lanza error cuando falla la red', async () => {
            vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

            await expect(fetchRanking()).rejects.toThrow('Network error');
        });

        it('devuelve array vacío si el ranking no tiene entradas', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ ranking: [] }),
            } as Response);

            const result = await fetchRanking();
            expect(result).toEqual([]);
        });
    });

    // ── recordGameResult ──────────────────────────────────────────────────────

    describe('recordGameResult', () => {
        it('llama al endpoint correcto con won=true', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ message: 'Result recorded' }),
            } as Response);

            await recordGameResult('Alice', true);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/game/result'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'Alice', won: true }),
                }
            );
        });

        it('llama al endpoint correcto con won=false', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({ message: 'Result recorded' }),
            } as Response);

            await recordGameResult('Bob', false);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/game/result'),
                expect.objectContaining({
                    body: JSON.stringify({ username: 'Bob', won: false }),
                })
            );
        });

        it('no lanza error si el fetch falla (fallo silencioso)', async () => {
            vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            // No debe lanzar
            await expect(recordGameResult('Alice', true)).resolves.toBeUndefined();
            expect(warnSpy).toHaveBeenCalled();
        });

        it('no lanza error si la respuesta no es ok (fallo silencioso)', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            await expect(recordGameResult('Alice', true)).resolves.toBeUndefined();
        });
    });
});