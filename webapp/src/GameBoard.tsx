import { useMemo, useState } from 'react';
import './styles/GameBoard.css';

type Player = 0 | 1;

type Cell = {
  index: number;
  row: number;
  x: number;
  y: number;
  z: number;
};

interface GameBoardProps {
  username: string;
  onExit: () => void;
}

const PLAYER_NAME: Record<Player, string> = {
  0: 'Azul',
  1: 'Rojo',
};

function otherPlayer(player: Player): Player {
  return player === 0 ? 1 : 0;
}

function createCells(size: number): Cell[] {
  const cells: Cell[] = [];
  let index = 0;

  for (let row = 0; row < size; row += 1) {
    const x = size - 1 - row;
    for (let y = 0; y <= row; y += 1) {
      const z = row - y;
      cells.push({ index, row, x, y, z });
      index += 1;
    }
  }

  return cells;
}

function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y},${cell.z}`;
}

function findNeighbors(cell: Cell, byKey: Map<string, Cell>): Cell[] {
  const neighbors: Cell[] = [];
  const { x, y, z } = cell;

  const candidates: Array<[number, number, number]> = [
    [x - 1, y + 1, z],
    [x - 1, y, z + 1],
    [x + 1, y - 1, z],
    [x, y - 1, z + 1],
    [x + 1, y, z - 1],
    [x, y + 1, z - 1],
  ];

  candidates.forEach(([nx, ny, nz]) => {
    if (nx < 0 || ny < 0 || nz < 0) {
      return;
    }

    const neighbor = byKey.get(`${nx},${ny},${nz}`);
    if (neighbor) {
      neighbors.push(neighbor);
    }
  });

  return neighbors;
}

function hasWinningConnection(cells: Cell[], occupiedByPlayer: Set<number>): boolean {
  const byKey = new Map<string, Cell>();
  cells.forEach((cell) => {
    byKey.set(keyOf(cell), cell);
  });

  const visited = new Set<number>();

  for (const cell of cells) {
    if (!occupiedByPlayer.has(cell.index) || visited.has(cell.index)) {
      continue;
    }

    const stack = [cell];
    let touchesA = false;
    let touchesB = false;
    let touchesC = false;

    while (stack.length > 0) {
      const current = stack.pop() as Cell;
      if (visited.has(current.index)) {
        continue;
      }

      visited.add(current.index);

      if (current.x === 0) touchesA = true;
      if (current.y === 0) touchesB = true;
      if (current.z === 0) touchesC = true;

      const neighbors = findNeighbors(current, byKey);
      neighbors.forEach((neighbor) => {
        if (occupiedByPlayer.has(neighbor.index) && !visited.has(neighbor.index)) {
          stack.push(neighbor);
        }
      });
    }

    if (touchesA && touchesB && touchesC) {
      return true;
    }
  }

  return false;
}

const GameBoard = ({ username, onExit }: GameBoardProps) => {
  const boardSize = 8;
  const [occupied, setOccupied] = useState<Record<number, Player>>({});
  const [nextPlayer, setNextPlayer] = useState<Player>(0);
  const [winner, setWinner] = useState<Player | null>(null);

  const cells = useMemo(() => createCells(boardSize), [boardSize]);

  const playAt = (index: number) => {
    if (winner !== null || occupied[index] !== undefined) {
      return;
    }

    const player = nextPlayer;
    const nextOccupied: Record<number, Player> = { ...occupied, [index]: player };
    setOccupied(nextOccupied);

    const occupiedByPlayer = new Set<number>(
      Object.entries(nextOccupied)
        .filter(([, cellPlayer]) => cellPlayer === player)
        .map(([cellIndex]) => Number(cellIndex)),
    );

    const didWin = hasWinningConnection(cells, occupiedByPlayer);
    if (didWin) {
      setWinner(player);
      return;
    }

    setNextPlayer(otherPlayer(player));
  };

  const statusText =
    winner === null
      ? `ES TU TURNO, JUGADOR ${PLAYER_NAME[nextPlayer].toUpperCase()}`
      : `GANO JUGADOR ${PLAYER_NAME[winner].toUpperCase()}`;
  const layoutStateClass = winner !== null ? `state-win-${winner === 0 ? 'blue' : 'red'}` : `state-turn-${nextPlayer === 0 ? 'blue' : 'red'}`;
  const statusClass =
    winner !== null
      ? `game-status game-status--win game-status--${winner === 0 ? 'blue' : 'red'}`
      : `game-status game-status--turn game-status--${nextPlayer === 0 ? 'blue' : 'red'}`;

  return (
    <section className={`game-layout ${layoutStateClass}`} aria-label="Tablero de juego Y">
      <header className="game-header">
        <div className="title-block">
          <h2>Tablero Y de {username}</h2>
          <div className="game-controls">
            <button type="button" className="exit-button" onClick={onExit}>
              Salir
            </button>
          </div>
        </div>

        <p className={statusClass}>{statusText}</p>

        <div className="player-pills">
          <span className={`pill pill-blue ${winner === 0 || (winner === null && nextPlayer === 0) ? 'active' : ''}`}>Azul</span>
          <span className={`pill pill-red ${winner === 1 || (winner === null && nextPlayer === 1) ? 'active' : ''}`}>Rojo</span>
        </div>
      </header>

      <div className="y-board-wrap">
        <div className="side-label side-a">Lado A</div>
        <div className="side-label side-b">Lado B</div>
        <div className="side-label side-c">Lado C</div>

        <div className="y-board">
          {Array.from({ length: boardSize }, (_, row) => {
            const rowCells = cells.filter((cell) => cell.row === row);
            return (
              <div key={row} className="y-row" style={{ marginLeft: `${(boardSize - 1 - row) * 32}px` }}>
                {rowCells.map((cell) => {
                  const owner = occupied[cell.index];
                  const playerClass = owner === undefined ? 'empty' : owner === 0 ? 'blue' : 'red';

                  return (
                    <button
                      type="button"
                      key={cell.index}
                      className={`y-cell ${playerClass}`}
                      onClick={() => playAt(cell.index)}
                      disabled={winner !== null || owner !== undefined}
                      title={`idx ${cell.index} - (${cell.x},${cell.y},${cell.z})`}
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
};

export default GameBoard;
