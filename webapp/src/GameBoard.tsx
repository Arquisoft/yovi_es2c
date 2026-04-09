import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    ButtonGroup,
    Chip,
    Stack,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    RestartAlt,
    ExitToApp,
    Person,
    SmartToy,
} from '@mui/icons-material';
import {
    type Coords,
    type YEN,
    type GameVariant,
    applyMove,
    chooseBotMove,
    gridToCoords,
    newGameYEN,
    parseLayout,
} from './GameyApi';
import { recordGameResult } from './UsersApi';

// CSS global para animaciones de las celdas
const CELL_STYLES = `
@keyframes popIn {
    0%   { transform: scale(0.3); opacity: 0; }
    70%  { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
}
@keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0px rgba(255,255,255,0.3); }
    50%       { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
}
`;

export type GameMode = 'local' | 'bot';
type BotId =
    | 'random_bot'
    | 'side_bot'
    | 'side_bot_hard'
    | 'center_bot'
    | 'corner_bot';

interface GameBoardProps {
    username: string;
    mode: GameMode;
    boardSize?: number;
    onExit: () => void;
}

const PLAYER_COLOR: Record<number, string> = { 0: '#4fc3f7', 1: '#ef5350' };
const PLAYER_NAME: Record<number, string> = { 0: 'Azul', 1: 'Rojo' };
const MIN_BOARD_SIZE = 5;

type Cell = { index: number; row: number; col: number; coords: Coords };

const BOT_THINK_MIN_MS = 500;

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
    for (let row = 0; row < rows.length; row++)
        for (let col = 0; col < rows[row].length; col++)
            map.set(index++, rows[row][col]);
    return map;
}

export default function GameBoard({ username, mode: initialMode, boardSize = 7, onExit }: GameBoardProps) {
    const safeBoardSize = Math.max(MIN_BOARD_SIZE, boardSize);

    const [mode, setMode] = useState<GameMode>(initialMode);
    const [botId, setBotId] = useState<BotId>('side_bot');
    const [variant, setVariant] = useState<GameVariant>('standard');
    const [yen, setYen] = useState<YEN>(() => newGameYEN(safeBoardSize, 'standard'));
    const [winner, setWinner] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startTimestamp, setStartTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000));
    const botTurnRef = useRef(false);

    const nextPlayer = yen.turn;
    const currentVariant = yen.variant;
    const cells = useMemo(() => buildCells(safeBoardSize), [safeBoardSize]);
    const indexMap = useMemo(() => layoutToIndexMap(yen), [yen]);
    const hasGameStarted = useMemo(
        () => Array.from(indexMap.values()).some((value) => value !== '.'),
        [indexMap],
    );
    const lockBotMatchSettings = mode === 'bot' && hasGameStarted;

    // ── Bot turn ──────────────────────────────────────────────────────────────
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
                // En modo bot, el jugador humano es siempre el jugador 0
                await recordGameResult(username, result.winner === 0);
            }
        } catch (e) {
            setError(`Error IA: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
            botTurnRef.current = false;
        }
    }, [botId, startTimestamp, username]);

    useEffect(() => {
        if (mode === 'bot' && nextPlayer === 1 && winner === null && !loading)
            runBotTurn(yen);
    }, [mode, nextPlayer, winner, loading, yen, runBotTurn]);

    // ── Human turn ────────────────────────────────────────────────────────────
    const playAt = useCallback(async (cell: Cell) => {
        if (winner !== null || loading) return;
        if (mode === 'bot' && nextPlayer === 1) return;
        const owned = indexMap.get(cell.index);
        if (owned && owned !== '.') return;

        setLoading(true);
        setError(null);
        try {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const durationSeconds = Math.max(0, nowSeconds - startTimestamp);
            const result = await applyMove(yen, cell.coords, username, durationSeconds);
            setYen(result.yen);
            if (result.status === 'finished' && result.winner !== null) {
                setWinner(result.winner);
                // En modo bot registramos el resultado del humano (jugador 0)
                // En modo local no registramos porque no sabemos quién es quién
                if (mode === 'bot') {
                    await recordGameResult(username, result.winner === 0);
                }
            }
        } catch (e) {
            setError(`Movimiento inválido: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    }, [winner, loading, mode, nextPlayer, indexMap, yen, startTimestamp, username]);

    // ── Reset / mode / variant ────────────────────────────────────────────────
    const reset = () => {
        setYen(newGameYEN(safeBoardSize, variant));
        setWinner(null);
        setError(null);
        setStartTimestamp(Math.floor(Date.now() / 1000));
    };
    const changeMode = (m: GameMode) => {
        setMode(m);
        setYen(newGameYEN(safeBoardSize, variant));
        setWinner(null);
        setError(null);
        setStartTimestamp(Math.floor(Date.now() / 1000));
    };
    const changeVariant = (v: GameVariant) => {
        setVariant(v);
        setYen(newGameYEN(safeBoardSize, v));
        setWinner(null);
        setError(null);
        setStartTimestamp(Math.floor(Date.now() / 1000));
    };

    // ── Derived UI state ──────────────────────────────────────────────────────
    const isBotThinking = mode === 'bot' && nextPlayer === 1 && loading;
    const statusText = isBotThinking
        ? 'LA IA ESTÁ PENSANDO…'
        : winner !== null
            ? `¡GANÓ ${PLAYER_NAME[winner].toUpperCase()}!`
            : `TURNO DE ${mode === 'bot' && nextPlayer === 0 ? username.toUpperCase() : PLAYER_NAME[nextPlayer].toUpperCase()}`;

    const activeColor = winner !== null ? PLAYER_COLOR[winner] : PLAYER_COLOR[nextPlayer];

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
                {/* Header */}
                <Box sx={{ width: '100%', maxWidth: 700 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight={800}>
                            YOVI ARENA
                            <Typography component="span" variant="caption"
                                        sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                                {username} · {currentVariant === 'standard' ? 'Estándar' : 'Why Not'}
                            </Typography>
                        </Typography>
                        <Stack direction="row" gap={1}>
                            <Button size="small" startIcon={<RestartAlt />} onClick={reset}
                                    sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                                    variant="outlined">
                                Nueva
                            </Button>
                            <Button size="small" startIcon={<ExitToApp />} onClick={onExit}
                                    sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                                    variant="outlined">
                                Salir
                            </Button>
                        </Stack>
                    </Stack>

                    {/* Controls */}
                    <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
                        <ButtonGroup size="small">
                            <Button onClick={() => changeMode('local')}
                                    variant={mode === 'local' ? 'contained' : 'outlined'}
                                    startIcon={<Person />}
                                    sx={mode === 'local'
                                        ? { bgcolor: '#4fc3f7', color: '#000' }
                                        : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                Local
                            </Button>
                            <Button onClick={() => changeMode('bot')}
                                    variant={mode === 'bot' ? 'contained' : 'outlined'}
                                    startIcon={<SmartToy />}
                                    sx={mode === 'bot'
                                        ? { bgcolor: '#ef5350', color: '#fff' }
                                        : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                Vs Bot
                            </Button>
                        </ButtonGroup>

                        <ButtonGroup size="small">
                            <Button onClick={() => changeVariant('standard')}
                                    disabled={lockBotMatchSettings}
                                    variant={currentVariant === 'standard' ? 'contained' : 'outlined'}
                                    sx={currentVariant === 'standard'
                                        ? { bgcolor: '#7c4dff', color: '#fff' }
                                        : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                Estándar
                            </Button>
                            <Button onClick={() => changeVariant('why_not')}
                                    disabled={lockBotMatchSettings}
                                    variant={currentVariant === 'why_not' ? 'contained' : 'outlined'}
                                    sx={currentVariant === 'why_not'
                                        ? { bgcolor: '#7c4dff', color: '#fff' }
                                        : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                Why Not
                            </Button>
                        </ButtonGroup>

                        {mode === 'bot' && (
                            <>
                                <ButtonGroup size="small">
                                    <Button
                                        onClick={() => setBotId('side_bot')}
                                        disabled={lockBotMatchSettings}
                                        variant={botId === 'side_bot' ? 'contained' : 'outlined'}
                                        sx={botId === 'side_bot'
                                            ? { bgcolor: '#26c6da', color: '#000' }
                                            : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                        Bot fácil
                                    </Button>
                                    <Button
                                        onClick={() => setBotId('side_bot_hard')}
                                        disabled={lockBotMatchSettings}
                                        variant={botId === 'side_bot_hard' ? 'contained' : 'outlined'}
                                        sx={botId === 'side_bot_hard'
                                            ? { bgcolor: '#ffb74d', color: '#000' }
                                            : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                        Bot difícil
                                    </Button>
                                    <Button
                                        onClick={() => setBotId('random_bot')}
                                        disabled={lockBotMatchSettings}
                                        variant={botId === 'random_bot' ? 'contained' : 'outlined'}
                                        sx={botId === 'random_bot'
                                            ? { bgcolor: '#8bc34a', color: '#000' }
                                            : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                        Aleatorio
                                    </Button>
                                </ButtonGroup>
                                <ButtonGroup size="small">
                                    <Button
                                        onClick={() => setBotId('center_bot')}
                                        disabled={lockBotMatchSettings}
                                        variant={botId === 'center_bot' ? 'contained' : 'outlined'}
                                        sx={botId === 'center_bot'
                                            ? { bgcolor: '#9575cd', color: '#000' }
                                            : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                        Bot centro
                                    </Button>
                                    <Button
                                        onClick={() => setBotId('corner_bot')}
                                        disabled={lockBotMatchSettings}
                                        variant={botId === 'corner_bot' ? 'contained' : 'outlined'}
                                        sx={botId === 'corner_bot'
                                            ? { bgcolor: '#4db6ac', color: '#000' }
                                            : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                                        Bot esquinas
                                    </Button>
                                </ButtonGroup>
                            </>
                        )}
                    </Stack>

                    {/* Status */}
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

                    {/* Players */}
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
                                    fontWeight: 700,
                                }}
                            />
                        ))}
                    </Stack>

                    {error && <Alert severity="error" sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b', mb: 1 }}>{error}</Alert>}
                </Box>

                {/* Board */}
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <Box sx={{ position: 'relative', display: 'inline-block', pt: 2, pb: 4 }}>

                        {/* Side labels */}
                        <Typography variant="caption" sx={{
                            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                            color: 'rgba(255,255,255,0.3)'
                        }}>Lado A</Typography>
                        <Typography variant="caption" sx={{
                            position: 'absolute', bottom: 0, left: 0,
                            color: 'rgba(255,255,255,0.3)'
                        }}>Lado B</Typography>
                        <Typography variant="caption" sx={{
                            position: 'absolute', bottom: 0, right: 0,
                            color: 'rgba(255,255,255,0.3)'
                        }}>Lado C</Typography>

                        {/* Rows */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            {Array.from({ length: safeBoardSize }, (_, row) => {
                                const rowCells = cells.filter((c) => c.row === row);
                                const cellSize = 38;
                                const cellGap = 10;
                                const offset = (safeBoardSize - 1 - row) * ((cellSize + cellGap) / 2);

                                return (
                                    <Box key={row} sx={{
                                        display: 'flex',
                                        ml: `${offset}px`,
                                        mb: '4px',
                                    }}>
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
                                                    onMouseEnter={(e) => {
                                                        if (!isDisabled && isEmpty) {
                                                            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.25)';
                                                            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 8px ${activeColor}`;
                                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${activeColor}50`;
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = bgColor;
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
