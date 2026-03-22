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

//Para animacion y pulsos, es un css global
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
    const [variant, setVariant] = useState<GameVariant>('standard');
    const [yen, setYen] = useState<YEN>(() => newGameYEN(safeBoardSize, 'standard'));
    const [winner, setWinner] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const botTurnRef = useRef(false);

    const nextPlayer = yen.turn;
    const currentVariant = yen.variant;
    const cells = useMemo(() => buildCells(safeBoardSize), [safeBoardSize]);
    const indexMap = useMemo(() => layoutToIndexMap(yen), [yen]);

    const runBotTurn = useCallback(async (currentYen: YEN) => {
        if (botTurnRef.current) return;
        botTurnRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const botCoords = await chooseBotMove(currentYen);
            const result = await applyMove(currentYen, botCoords);
            setYen(result.yen);
            if (result.status === 'finished') setWinner(result.winner);
        } catch (e) {
            setError(`Error IA: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
            botTurnRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (mode === 'bot' && nextPlayer === 1 && winner === null && !loading)
            runBotTurn(yen);
    }, [mode, nextPlayer, winner, loading, yen, runBotTurn]);

    const playAt = useCallback(async (cell: Cell) => {
        if (winner !== null || loading) return;
        if (mode === 'bot' && nextPlayer === 1) return;
        const owned = indexMap.get(cell.index);
        if (owned && owned !== '.') return;

        setLoading(true);
        setError(null);
        try {
            const result = await applyMove(yen, cell.coords);
            setYen(result.yen);
            if (result.status === 'finished') setWinner(result.winner);
        } catch (e) {
            setError(`Movimiento inválido: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    }, [winner, loading, mode, nextPlayer, indexMap, yen]);

    const reset = () => { setYen(newGameYEN(safeBoardSize, variant)); setWinner(null); setError(null); };
    const changeMode = (m: GameMode) => { setMode(m); setYen(newGameYEN(safeBoardSize, variant)); setWinner(null); setError(null); };
    const changeVariant = (v: GameVariant) => { setVariant(v); setYen(newGameYEN(safeBoardSize, v)); setWinner(null); setError(null); };

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
                                variant={currentVariant === 'standard' ? 'contained' : 'outlined'}
                                sx={currentVariant === 'standard'
                                    ? { bgcolor: '#7c4dff', color: '#fff' }
                                    : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                            Estándar
                        </Button>
                        <Button onClick={() => changeVariant('why_not')}
                                variant={currentVariant === 'why_not' ? 'contained' : 'outlined'}
                                sx={currentVariant === 'why_not'
                                    ? { bgcolor: '#7c4dff', color: '#fff' }
                                    : { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)' }}>
                            Why Not
                        </Button>
                    </ButtonGroup>
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
                                                    // Animación al colocar ficha
                                                    animation: !isEmpty ? 'popIn 0.3s ease forwards' : 'none',
                                                    // Pulso al hover (via CSS, no se puede inline, lo manejamos con onMouseEnter)
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