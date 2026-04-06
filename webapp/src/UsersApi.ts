const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ── Registrar resultado de partida ──────────────────────────────────────────
//centraliza las llamadas al servicio de usuarios

/**
 * Notifica al servidor el resultado de una partida.
 * @param username nombre del jugador humano
 * @param won      true si ganó, false si perdió
 */
export async function recordGameResult(username: string, won: boolean): Promise<void> {
    try {
        await fetch(`${API_URL}/game/result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, won }),
        });
    } catch (err) {
        // No bloqueamos el juego si falla el registro
        console.warn('Could not record game result:', err);
    }
}

// ── Obtener ranking ──────────────────────────────────────────────────────────

export interface RankingEntry {
    position: number;
    username: string;
    wins: number;
    losses: number;
    winRate: number;
}

/**
 * Obtiene el ranking global de jugadores ordenado por victorias.
 */
export async function fetchRanking(): Promise<RankingEntry[]> {
    const res = await fetch(`${API_URL}/ranking`);
    if (!res.ok) throw new Error('Could not fetch ranking');
    const data = await res.json();
    return data.ranking as RankingEntry[];
}