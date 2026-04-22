/**
 * gameyApi.ts
 * -----------
 * Client for the Gamey server (port 4000).
 * Covers both the bot-choose endpoint and the new game-move endpoint.
 */

// Default to localhost for local development; production should override via VITE_GAMEY_URL.
const GAMEY_URL = import.meta.env.VITE_GAMEY_URL ?? "http://localhost:4000";
const API_VERSION = "v1";
const MIN_BOARD_SIZE = 5;

// ─── Shared types ────────────────────────────────────────────────────────────

/** Y Exchange Notation — serialised game state sent to/from Gamey. */
export interface YEN {
    size: number;
    turn: number;          // 0 = Blue's turn, 1 = Red's turn
    players: string[];     // ["B", "R"]
    layout: string;        // e.g. "B/../..." rows joined by '/'
    variant: GameVariant;  // "standard" | "why_not"
}

/** Barycentric coordinates (x + y + z must equal board_size - 1). */
export interface Coords {
    x: number;
    y: number;
    z: number;
}

export type GameVariant = "standard" | "why_not";

export interface HistoryGame {
    username?: string | null;
    winner: string | null;
    board_size: number;
    moves_count: number;
    timestamp: number;
    duration_seconds: number;
}

export interface HistoryResponse {
    api_version: string;
    games: HistoryGame[];
}

// ─── /game/move ──────────────────────────────────────────────────────────────

export interface GameMoveResponse {
    yen: YEN;
    status: "ongoing" | "finished";
    winner: number | null;   // 0 = Blue, 1 = Red, null = not finished yet
    next_player: number | null;
}

/**
 * Apply a human move to a YEN game state.
 *
 * @param yen    Current game state
 * @param coords Barycentric coordinates of the cell to occupy
 * @param username Logged-in username (used to store friendly winner name)
 * @returns      Updated state, status, and optional winner
 * @throws       Error with a human-readable message on invalid move or network failure
 */
export async function applyMove(
    yen: YEN,
    coords: Coords,
    username: string,
    durationSeconds?: number
): Promise<GameMoveResponse> {
    const res = await fetch(`${GAMEY_URL}/${API_VERSION}/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yen, ...coords, username, duration_seconds: durationSeconds }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message ?? `HTTP ${res.status}`);
    }

    return data as GameMoveResponse;
}

// ─── /ybot/choose ────────────────────────────────────────────────────────────

export interface BotChooseResponse {
    api_version: string;
    bot_id: string;
    coords: Coords;
}

export type BotId =
    | 'random_bot'
    | 'side_bot'
    | 'side_bot_hard'
    | 'blocker_bot'
    | 'bridge_bot'
    | 'center_bot'
    | 'corner_bot';

export interface BotInfo {
    id: BotId;
    title: string;
    description: string;
    tags?: string[];
}

export const FALLBACK_BOTS: BotInfo[] = [
    { id: 'side_bot', title: 'Facil', description: 'Bot sencillo: tiende a jugar cerca de los lados.', tags: ['basic'] },
    { id: 'side_bot_hard', title: 'Dificil', description: 'Bot mas agresivo: presiona por los lados con mejor criterio.', tags: ['basic'] },
    { id: 'random_bot', title: 'Aleatorio', description: 'Sin estrategia: elige un movimiento valido al azar.', tags: ['basic'] },
    { id: 'blocker_bot', title: 'Bot bloqueador', description: 'Prioriza bloquear amenazas inmediatas.', tags: ['strategy'] },
    { id: 'bridge_bot', title: 'Bot puente', description: 'Busca conectar regiones y crear puentes.', tags: ['strategy'] },
    { id: 'center_bot', title: 'Bot centro', description: 'Prefiere celdas centrales.', tags: ['strategy'] },
    { id: 'corner_bot', title: 'Bot esquinas', description: 'Prefiere las esquinas.', tags: ['strategy'] },
];

/**
 * Ask a bot to choose its next move given a YEN game state.
 *
 * @param yen   Current game state (it will be the bot's turn)
 * @param botId Bot identifier — use "random_bot" for the built-in random bot
 * @returns     The coordinates the bot wants to play
 */
export async function chooseBotMove(
    yen: YEN,
    botId: BotId = 'random_bot',
): Promise<Coords> {
    const res = await fetch(`${GAMEY_URL}/${API_VERSION}/ybot/choose/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yen }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message ?? `HTTP ${res.status}`);
    }

    return (data as BotChooseResponse).coords;
}

export async function fetchAvailableBots(): Promise<BotInfo[]> {
    const res = await fetch(`${GAMEY_URL}/${API_VERSION}/ybot/bots`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data?.bots)) {
        throw new TypeError('Respuesta invalida del servidor');
    }

    return data.bots as BotInfo[];
}

export async function fetchGameHistory(username?: string): Promise<HistoryGame[]> {
    const url = new URL(`${GAMEY_URL}/${API_VERSION}/game/history`);
    if (username && username.trim()) {
        url.searchParams.set('username', username.trim());
    }

    const res = await fetch(url.toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message ?? `HTTP ${res.status}`);
    }

    return (data as HistoryResponse).games;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build an empty YEN for a new game with the given board size.
 * Player 0 (Blue) always goes first.
 */
export function newGameYEN(size: number, variant: GameVariant): YEN {
    if (size < MIN_BOARD_SIZE) {
        throw new Error(`Board size must be at least ${MIN_BOARD_SIZE}`);
    }

    const layout = Array.from({ length: size }, (_, r) =>
        ".".repeat(r + 1)
    ).join("/");

    return { size, turn: 0, players: ["B", "R"], layout, variant };
}

/**
 * Parse a YEN layout into a 2-D array of cell values.
 *
 * Returns `cells[row][col]` where:
 *   - row 0 is the top apex (1 cell)
 *   - row size-1 is the bottom edge (size cells)
 *   - each value is 'B', 'R', or '.'
 */
export function parseLayout(yen: YEN): string[][] {
    return yen.layout.split("/").map((row) => row.split(""));
}

/**
 * Convert (row, col) grid position to barycentric coordinates.
 *
 * row 0 = top, col 0 = left within that row.
 */
export function gridToCoords(row: number, col: number, size: number): Coords {
    const x = size - 1 - row;
    const y = col;
    const z = row - col;
    return { x, y, z };
}
