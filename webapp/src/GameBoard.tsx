import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles/GameBoard.css';
import {
  type Coords,
  type YEN,
  applyMove,
  chooseBotMove,
  gridToCoords,
  newGameYEN,
  parseLayout,
} from './GameyApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GameMode = 'local' | 'bot';

interface GameBoardProps {
  username: string;
  mode: GameMode;
  boardSize?: number;
  onExit: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAYER_COLOR: Record<number, 'blue' | 'red'> = { 0: 'blue', 1: 'red' };
const PLAYER_NAME: Record<number, string> = { 0: 'Azul', 1: 'Rojo' };

type Cell = {
  index: number;
  row: number;
  col: number;
  coords: Coords;
};

function buildCells(size: number): Cell[] {
  const cells: Cell[] = [];
  let index = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= row; col++) {
      cells.push({ index, row, col, coords: gridToCoords(row, col, size) });
      index++;
    }
  }
  return cells;
}

/** Convert YEN layout to a flat Map of index → 'B'|'R'|'.' */
function layoutToIndexMap(yen: YEN): Map<number, string> {
  const map = new Map<number, string>();
  const rows = parseLayout(yen);
  let index = 0;
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      map.set(index++, rows[row][col]);
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameBoard({
                                    username,
                                    mode,
                                    boardSize = 8,
                                    onExit,
                                  }: GameBoardProps) {
  const [yen, setYen] = useState<YEN>(() => newGameYEN(boardSize));
  const [winner, setWinner] = useState<number | null>(null);
  const nextPlayer = yen.turn;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botTurnRef = useRef(false);

  const cells = useMemo(() => buildCells(boardSize), [boardSize]);
  const indexMap = useMemo(() => layoutToIndexMap(yen), [yen]);

  // ── Bot turn ────────────────────────────────────────────────────────────────
  const runBotTurn = useCallback(
      async (currentYen: YEN) => {
        if (botTurnRef.current) return;
        botTurnRef.current = true;
        setLoading(true);
        setError(null);
        try {
          const botCoords = await chooseBotMove(currentYen);
          const result = await applyMove(currentYen, botCoords);
          setYen(result.yen);
          if (result.status === 'finished') {
            setWinner(result.winner);
          }
        } catch (e) {
          setError(`Movimiento inválido: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setLoading(false);
          botTurnRef.current = false;
        }
      },
      [],
  );

  // Trigger bot automatically when it's player 1's turn in bot mode
  useEffect(() => {
    if (mode === 'bot' && nextPlayer === 1 && winner === null && !loading) {
      runBotTurn(yen);
    }
  }, [mode, nextPlayer, winner, loading, yen, runBotTurn]);

  // ── Human turn ──────────────────────────────────────────────────────────────
  const playAt = useCallback(
      async (cell: Cell) => {
        if (winner !== null || loading) return;
        if (mode === 'bot' && nextPlayer === 1) return; // bot's turn

        const owned = indexMap.get(cell.index);
        if (owned && owned !== '.') return; // cell occupied

        setLoading(true);
        setError(null);
        try {
          const result = await applyMove(yen, cell.coords);
          setYen(result.yen);
          if (result.status === 'finished') {
            setWinner(result.winner);
          }
        } catch (e) {
          setError(`Movimiento inválido: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setLoading(false);
        }
      },
      [winner, loading, mode, nextPlayer, indexMap, yen],
  );

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = () => {
    setYen(newGameYEN(boardSize));
    setWinner(null);
    setError(null);
  };

  // ── Derived UI state ────────────────────────────────────────────────────────
  const isBotThinking = mode === 'bot' && nextPlayer === 1 && loading;

  const statusText = (() => {
    if (isBotThinking) return 'LA IA ESTÁ PENSANDO…';
    if (winner !== null) return `¡GANÓ JUGADOR ${PLAYER_NAME[winner].toUpperCase()}!`;
    const whose = mode === 'bot' && nextPlayer === 0 ? username.toUpperCase() : PLAYER_NAME[nextPlayer].toUpperCase();
    return `ES TU TURNO, ${whose}`;
  })();

  const colorKey = winner !== null ? PLAYER_COLOR[winner] : PLAYER_COLOR[nextPlayer];
  const layoutStateClass = winner !== null ? `state-win-${colorKey}` : `state-turn-${colorKey}`;
  const statusClass = [
    'game-status',
    winner !== null ? 'game-status--win' : 'game-status--turn',
    `game-status--${colorKey}`,
  ].join(' ');

  return (
      <section className={`game-layout ${layoutStateClass}`} aria-label="Tablero de juego Y">
        <header className="game-header">
          <div className="title-block">
            <h2>Tablero Y · {username}</h2>
            <div className="game-controls">
              <button type="button" className="exit-button" onClick={reset}>
                Nueva partida
              </button>
              <button type="button" className="exit-button" onClick={onExit}>
                Salir
              </button>
            </div>
          </div>

          <p className={statusClass}>{statusText}</p>

          {error && (
              <p className="game-error">{error}</p>
          )}

          <div className="player-pills">
          <span className={`pill pill-blue ${nextPlayer === 0 || winner === 0 ? 'active' : ''}`}>
            {mode === 'bot' ? username : 'Azul'}
          </span>
            <span className={`pill pill-red ${nextPlayer === 1 || winner === 1 ? 'active' : ''}`}>
            {mode === 'bot' ? 'IA Bot' : 'Rojo'}
          </span>
          </div>
        </header>

        <div className="y-board-wrap">
          <div className="side-label side-a">Lado A</div>
          <div className="side-label side-b">Lado B</div>
          <div className="side-label side-c">Lado C</div>

          <div className="y-board">
            {Array.from({ length: boardSize }, (_, row) => {
              const rowCells = cells.filter((c) => c.row === row);
              return (
                  <div
                      key={row}
                      className="y-row"
                      style={{ marginLeft: `${(boardSize - 1 - row) * 32}px` }}
                  >
                    {rowCells.map((cell) => {
                      const symbol = indexMap.get(cell.index) ?? '.';
                      const playerClass =
                          symbol === 'B' ? 'blue' : symbol === 'R' ? 'red' : 'empty';
                      const isDisabled =
                          winner !== null ||
                          symbol !== '.' ||
                          loading ||
                          (mode === 'bot' && nextPlayer === 1);

                      return (
                          <button
                              type="button"
                              key={cell.index}
                              className={`y-cell ${playerClass}`}
                              onClick={() => playAt(cell)}
                              disabled={isDisabled}
                              title={`(${cell.coords.x},${cell.coords.y},${cell.coords.z})`}
                              aria-label={`celda ${cell.index}`}
                          />
                      );
                    })}
                  </div>
              );
            })}
          </div>
        </div>
      </section>
  );
}