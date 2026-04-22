import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import { ExitToApp, Person, RestartAlt, SmartToy } from '@mui/icons-material';
import {
    applyMove,
    chooseBotMove,
    gridToCoords,
    newGameYEN,
    parseLayout,
    type BotId,
    type Coords,
    type GameVariant,
    type YEN,
} from './GameyApi';
import { recordGameResult } from './UsersApi';

// CSS global para animaciones de las celdas
const CELL_STYLES = `
@keyframes popIn {
  0%   { transform: scale(0.3); opacity: 0; }
  70%  { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
`;

export type GameMode = 'local' | 'bot';

interface GameBoardProps {
    username: string;
    mode: GameMode;
    boardSize?: number;
    variant?: GameVariant;
    botId?: BotId;
    onExit: () => void;
}

const PLAYER_COLOR: Record<number, string> = { 0: '#4fc3f7', 1: '#ef5350' };
const PLAYER_NAME: Record<number, string> = { 0: 'Azul', 1: 'Rojo' };
const MIN_BOARD_SIZE = 5;
const BOT_THINK_MIN_MS = 500;

type Cell = { index: number; row: number; col: number; coords: Coords };

function getErrorMessage(e: unknown): string {
    if (typeof e === 'object' && e !== null && 'message' in e) {
        return String((e as { message?: unknown }).message ?? 'Error');
    }
    return String(e);
}

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

export default function GameBoard({
    username,
    mode,
    boardSize = 7,
    variant = 'standard',
    botId = 'side_bot',
    onExit,
}: GameBoardProps) {
    const safeBoardSize = Math.max(MIN_BOARD_SIZE, boardSize);

    const [yen, setYen] = useState<YEN>(() => newGameYEN(safeBoardSize, variant));
    const [winner, setWinner] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startTimestamp, setStartTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000));
    const botTurnRef = useRef(false);

    const nextPlayer = yen.turn;
    const cells = useMemo(() => buildCells(safeBoardSize), [safeBoardSize]);
    const indexMap = useMemo(() => layoutToIndexMap(yen), [yen]);

    const isBotThinking = mode === 'bot' && nextPlayer === 1 && loading;
    const statusText = isBotThinking
        ? 'LA IA ESTA PENSANDO...'
        : winner !== null
            ? `GANO ${PLAYER_NAME[winner].toUpperCase()}!`
            : `TURNO DE ${mode === 'bot' && nextPlayer === 0 ? username.toUpperCase() : PLAYER_NAME[nextPlayer].toUpperCase()}`;

    const activeColor = winner !== null ? PLAYER_COLOR[winner] : PLAYER_COLOR[nextPlayer];

    const reset = () => {
        setYen(newGameYEN(safeBoardSize, variant));
        setWinner(null);
        setError(null);
        setStartTimestamp(Math.floor(Date.now() / 1000));
    };

    const runBotTurn = useCallback(async (currentYen: YEN) => {
        if (botTurnRef.current) return;
        botTurnRef.current = true;
        setLoading(true);
        setError(null);
        try {
            await new Promise((resolve) => setTimeout(resolve, BOT_THINK_MIN_MS));
            const nowSeconds = Math.floor(Date.now() / 1000);
            const durationSeconds = Math.max(0, nowSeconds - startTimestamp);
            const botCoords = await chooseBotMove(currentYen, botId);
            const result = await applyMove(currentYen, botCoords, username, durationSeconds);
            setYen(result.yen);
            if (result.status === 'finished' && result.winner !== null) {
                setWinner(result.winner);
                await recordGameResult(username, result.winner === 0);
            }
        } catch (e) {
            setError(`Error IA: ${getErrorMessage(e)}`);
        } finally {
            setLoading(false);
            botTurnRef.current = false;
        }
    }, [botId, startTimestamp, username]);

    useEffect(() => {
        if (mode === 'bot' && nextPlayer === 1 && winner === null && !loading) {
            runBotTurn(yen);
        }
    }, [mode, nextPlayer, winner, loading, yen, runBotTurn]);

    const playAt = useCallback(async (cell: Cell) => {
        if (winner !== null) return;
        if (loading) return;
        if (mode === 'bot' && nextPlayer === 1) return;

        const symbol = indexMap.get(cell.index) ?? '.';
        if (symbol !== '.') return;

        setLoading(true);
        setError(null);
        try {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const durationSeconds = Math.max(0, nowSeconds - startTimestamp);
            const result = await applyMove(yen, cell.coords, username, durationSeconds);
            setYen(result.yen);
            if (result.status === 'finished' && result.winner !== null) {
                setWinner(result.winner);
                if (mode === 'bot') {
                    await recordGameResult(username, result.winner === 0);
                }
            }
        } catch (e) {
            setError(`Movimiento invalido: ${getErrorMessage(e)}`);
        } finally {
            setLoading(false);
        }
    }, [winner, loading, mode, nextPlayer, indexMap, yen, startTimestamp, username]);

    return (
        <>
            <style>{CELL_STYLES}</style>
            <Box sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                color: 'white',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
            }}>
                <Box sx={{ width: '100%', maxWidth: 700 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight={800}>
                            YOVI ARENA
                            <Typography component="span" variant="caption"
                                        sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                                {username} · {yen.variant === 'standard' ? 'Estandar' : 'Why Not'}
                            </Typography>
                        </Typography>
                        <Stack direction="row" gap={1}>
                            <Button
                                size="small"
                                startIcon={<RestartAlt />}
                                onClick={reset}
                                sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                                variant="outlined"
                            >
                                Nueva
                            </Button>
                            <Button
                                size="small"
                                startIcon={<ExitToApp />}
                                onClick={onExit}
                                sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                                variant="outlined"
                            >
                                Salir
                            </Button>
                        </Stack>
                    </Stack>

                    <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
                        <Chip
                            label={mode === 'bot' ? 'Vs Bot' : 'Local'}
                            icon={mode === 'bot' ? <SmartToy /> : <Person />}
                            sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }}
                        />
                    </Stack>

                    <Box sx={{
                        bgcolor: `${activeColor}18`,
                        border: `1px solid ${activeColor}`,
                        borderRadius: 2,
                        p: 1.5,
                        textAlign: 'center',
                        mb: 1,
                    }}>
                        <Typography fontWeight={800} letterSpacing={2} sx={{ color: activeColor }}>
                            {isBotThinking
                                ? <><CircularProgress size={14} sx={{ mr: 1, color: activeColor }} />{statusText}</>
                                : statusText
                            }
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b', mb: 1 }}>
                            {error}
                        </Alert>
                    )}

                    <Stack direction="row" justifyContent="center" gap={2} mb={1}>
                        {[0, 1].map((p) => (
                            <Chip
                                key={p}
                                label={p === 0
                                    ? (mode === 'bot' ? username : 'Azul')
                                    : (mode === 'bot' ? 'IA Bot' : 'Rojo')
                                }
                                sx={{
                                    bgcolor: (nextPlayer === p || winner === p)
                                        ? `${PLAYER_COLOR[p]}30`
                                        : 'rgba(255,255,255,0.05)',
                                    color: (nextPlayer === p || winner === p)
                                        ? PLAYER_COLOR[p]
                                        : 'rgba(255,255,255,0.3)',
                                    border: `1px solid ${(nextPlayer === p || winner === p)
                                        ? PLAYER_COLOR[p]
                                        : 'transparent'}`,
                                }}
                            />
                        ))}
                    </Stack>

                    <Box sx={{
                        bgcolor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        p: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        overflowX: 'auto',
                    }}>
                        <Box sx={{ minWidth: 520 }}>
                            {Array.from({ length: safeBoardSize }, (_, row) => {
                                const rowCells = cells.filter((c) => c.row === row);
                                const cellSize = 38;
                                const cellGap = 10;
                                const offset = (safeBoardSize - 1 - row) * ((cellSize + cellGap) / 2);

                                return (
                                    <Box key={row} sx={{ display: 'flex', ml: `${offset}px`, mb: '4px' }}>
                                        {rowCells.map((cell) => {
                                            const symbol = indexMap.get(cell.index) ?? '.';
                                            const isBlue = symbol === 'B';
                                            const isRed = symbol === 'R';
                                            const isEmpty = symbol === '.';
                                            const isDisabled = winner !== null || !isEmpty || loading
                                                || (mode === 'bot' && nextPlayer === 1);

                                            const bgColor = isBlue
                                                ? '#4fc3f7'
                                                : isRed
                                                    ? '#ef5350'
                                                    : 'rgba(255,255,255,0.05)';
                                            const borderColor = isBlue
                                                ? '#4fc3f7'
                                                : isRed
                                                    ? '#ef5350'
                                                    : 'rgba(255,255,255,0.25)';

                                            return (
                                                <button
                                                    key={cell.index}
                                                    onClick={() => !isDisabled && playAt(cell)}
                                                    disabled={isDisabled}
                                                    title={`(${cell.coords.x},${cell.coords.y},${cell.coords.z})`}
                                                    style={{
                                                        width: cellSize,
                                                        height: cellSize,
                                                        borderRadius: '50%',
                                                        border: `2px solid ${borderColor}`,
                                                        backgroundColor: bgColor,
                                                        marginRight: cellGap,
                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                        padding: 0,
                                                        flexShrink: 0,
                                                        animation: !isEmpty ? 'popIn 0.3s ease forwards' : 'none',
                                                        transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.15s',
                                                    }}
                                                />
                                            );
                                        })}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </>
    );
}
