import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    applyMove,
    chooseBotMove,
    fetchGameHistory,
    newGameYEN,
    parseLayout,
    gridToCoords,
    type YEN,
} from '../GameyApi.ts';

const sampleYen: YEN = {
    size: 5,
    turn: 0,
    players: ['B', 'R'],
    layout: './../.../..../.....',
    variant: 'standard',
};

describe('GameApi', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('applyMove', () => {
        it('envía la jugada al endpoint correcto y devuelve la respuesta', async () => {
            const mockResponse = {
                yen: {
                    ...sampleYen,
                    turn: 1,
                    layout: 'B/../.../..../.....',
                },
                status: 'ongoing',
                winner: null,
                next_player: 1,
            };

            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            } as Response);

            const result = await applyMove(sampleYen, { x: 4, y: 0, z: 0 }, 'test_user', 0);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/game/move'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        yen: sampleYen,
                        x: 4,
                        y: 0,
                        z: 0,
                    }),
                }
            );

            expect(result).toEqual(mockResponse);
        });

        it('lanza el mensaje del backend cuando la respuesta no es ok', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 400,
                json: async () => ({ message: 'Invalid move' }),
            } as Response);

            await expect(
                applyMove(sampleYen, { x: 1, y: 1, z: 2 }, 'test_user', 0)
            ).rejects.toThrow('Invalid move');
        });

        it('lanza HTTP status si el backend falla sin message', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 500,
                json: async () => ({}),
            } as Response);

            await expect(
                applyMove(sampleYen, { x: 1, y: 1, z: 2 }, 'test_user', 0)
            ).rejects.toThrow('HTTP 500');
        });
    });

    describe('chooseBotMove', () => {
        it('usa random_bot por defecto y devuelve coords', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({
                    api_version: 'v1',
                    bot_id: 'random_bot',
                    coords: { x: 2, y: 1, z: 1 },
                }),
            } as Response);

            const result = await chooseBotMove(sampleYen);

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/ybot/choose/random_bot'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ yen: sampleYen }),
                }
            );

            expect(result).toEqual({ x: 2, y: 1, z: 1 });
        });

        it('usa el botId indicado', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({
                    api_version: 'v1',
                    bot_id: 'smart_bot',
                    coords: { x: 0, y: 0, z: 4 },
                }),
            } as Response);

            const result = await chooseBotMove(sampleYen, 'smart_bot');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/ybot/choose/smart_bot'),
                expect.any(Object)
            );
            expect(result).toEqual({ x: 0, y: 0, z: 4 });
        });

        it('lanza error si chooseBotMove falla', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ message: 'Bot not found' }),
            } as Response);

            await expect(chooseBotMove(sampleYen, 'ghost_bot')).rejects.toThrow(
                'Bot not found'
            );
        });
    });

    describe('fetchGameHistory', () => {
        it('obtiene el historial y devuelve games', async () => {
            const games = [
                {
                    winner: 'B',
                    board_size: 5,
                    moves_count: 12,
                    timestamp: 123456789,
                    duration_seconds: 50,
                },
            ];

            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => ({
                    api_version: 'v1',
                    games,
                }),
            } as Response);

            const result = await fetchGameHistory();

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/v1/game/history'),
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            expect(result).toEqual(games);
        });

        it('lanza error si fetchGameHistory falla', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 503,
                json: async () => ({ message: 'Service unavailable' }),
            } as Response);

            await expect(fetchGameHistory()).rejects.toThrow('Service unavailable');
        });
    });

    describe('helpers', () => {
        it('newGameYEN crea un tablero vacío correcto', () => {
            const yen = newGameYEN(5, 'standard');

            expect(yen).toEqual({
                size: 5,
                turn: 0,
                players: ['B', 'R'],
                layout: './../.../..../.....',
                variant: 'standard',
            });
        });

        it('newGameYEN falla si el tamaño es menor que 5', () => {
            expect(() => newGameYEN(4, 'standard')).toThrow(
                'Board size must be at least 5'
            );
        });

        it('parseLayout convierte el layout en matriz', () => {
            const result = parseLayout({
                ...sampleYen,
                layout: 'B/RR/.../..../.....',
            });

            expect(result).toEqual([
                ['B'],
                ['R', 'R'],
                ['.', '.', '.'],
                ['.', '.', '.', '.'],
                ['.', '.', '.', '.', '.'],
            ]);
        });

        it('gridToCoords convierte correctamente row y col a coordenadas barycentricas', () => {
            expect(gridToCoords(0, 0, 5)).toEqual({ x: 4, y: 0, z: 0 });
            expect(gridToCoords(2, 1, 5)).toEqual({ x: 2, y: 1, z: 1 });
            expect(gridToCoords(4, 2, 5)).toEqual({ x: 0, y: 2, z: 2 });
        });
    });
});