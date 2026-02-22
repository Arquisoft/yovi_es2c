/**
 * gameyApi.ts
 * -----------
 * Client for the Gamey server (port 4000).
 * Covers both the bot-choose endpoint and the new game-move endpoint.
 */

const GAMEY_URL = import.meta.env.VITE_GAMEY_URL ?? "http://localhost:4000";
const API_VERSION = "v1";

// ─── Shared types ────────────────────────────────────────────────────────────

/** Y Exchange Notation — serialised game state sent to/from Gamey. */
export interface YEN {
    size: number;
    turn: number;          // 0 = Blue's turn, 1 = Red's turn
    players: string[];     // ["B", "R"]
    layout: string;        // e.g. "B/../..." rows joined by '/'
}

/** Barycentric coordinates (x + y + z must equal board_size - 1). */
export interface Coords {
    x: number;
    y: number;
    z: number;
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
 * @returns      Updated state, status, and optional winner
 * @throws       Error with a human-readable message on invalid move or network failure
 */
export async function applyMove(yen: YEN, coords: Coords): Promise<GameMoveResponse> {
    const res = await fetch(`${GAMEY_URL}/${API_VERSION}/game/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yen, ...coords }),
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

/**
 * Ask a bot to choose its next move given a YEN game state.
 *
 * @param yen   Current game state (it will be the bot's turn)
 * @param botId Bot identifier — use "random_bot" for the built-in random bot
 * @returns     The coordinates the bot wants to play
 */
export async function chooseBotMove(yen: YEN, botId = "random_bot"): Promise<Coords> {
    const res = await fetch(`${GAMEY_URL}/${API_VERSION}/ybot/choose/${botId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yen),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data?.message ?? `HTTP ${res.status}`);
    }

    return (data as BotChooseResponse).coords;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build an empty YEN for a new game with the given board size.
 * Player 0 (Blue) always goes first.
 */
export function newGameYEN(size: number): YEN {
    const layout = Array.from({ length: size }, (_, r) =>
        ".".repeat(r + 1)
    ).join("/");
    return { size, turn: 0, players: ["B", "R"], layout };
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