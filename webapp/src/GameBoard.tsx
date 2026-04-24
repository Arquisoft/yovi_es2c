import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import {
    ExitToApp,
    MusicNote,
    Person,
    RestartAlt,
    SmartToy,
    VolumeOff,
} from '@mui/icons-material';
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
import { getErrorMessage } from './utils/getErrorMessage';

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
    onExit: (didResign: boolean) => void;
}

const PLAYER_COLOR: Record<number, string> = { 0: '#4fc3f7', 1: '#ef5350' };
const PLAYER_NAME: Record<number, string> = { 0: 'Azul', 1: 'Rojo' };
const MIN_BOARD_SIZE = 5;
const BOT_THINK_MIN_MS = 500;
const DEFAULT_MUSIC_VOLUME = 0.35;

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
    for (const rowCells of rows) {
        for (const cell of rowCells) {
            map.set(index++, cell);
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
}: Readonly<GameBoardProps>) {
    const safeBoardSize = Math.max(MIN_BOARD_SIZE, boardSize);

    const [yen, setYen] = useState<YEN>(() => newGameYEN(safeBoardSize, variant));
    const [winner, setWinner] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startTimestamp, setStartTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000));
    const [isMuted, setIsMuted] = useState(false);
    const botTurnRef = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const nextPlayer = yen.turn;
    const cells = useMemo(() => buildCells(safeBoardSize), [safeBoardSize]);
    const indexMap = useMemo(() => layoutToIndexMap(yen), [yen]);

    const isBotThinking = mode === 'bot' && nextPlayer === 1 && loading;
    const winnerName = winner !== null ? PLAYER_NAME[winner].toUpperCase() : null;
    let statusText = isBotThinking
        ? 'LA IA ESTA PENSANDO...'
        : winner !== null
            ? `🏆 ENHORABUENA, GANA ${winnerName}! 🏆`
            : `TURNO DE ${mode === 'bot' && nextPlayer === 0 ? username.toUpperCase() : PLAYER_NAME[nextPlayer].toUpperCase()}`;

    // Si juega contra bot: evita "ENHORABUENA" cuando gana el bot.
    if (winner !== null && mode === 'bot') {
        if (winner === 1) statusText = `GANA ${winnerName}!`;
        if (winner === 0) statusText = `ENHORABUENA, GANA ${username.toUpperCase()}!`;
    }

    const activeColor = winner !== null ? PLAYER_COLOR[winner] : PLAYER_COLOR[nextPlayer];

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = DEFAULT_MUSIC_VOLUME;
        audio.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = 0;
        audio.volume = DEFAULT_MUSIC_VOLUME;
        audio.muted = isMuted;

        audio.play()?.catch?.(() => undefined);

        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    const reset = () => {
        setYen(newGameYEN(safeBoardSize, variant));
        setWinner(null);
        setError(null);
        setStartTimestamp(Math.floor(Date.now() / 1000));
    };

    const handleToggleMute = () => {
        setIsMuted((current) => !current);
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
            <audio ref={audioRef} src="/pink-panther.mp3" loop preload="auto" />
            <Box sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                color: 'white',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
                overflow: 'hidden',
                isolation: 'isolate',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: '-12%',
                    backgroundImage: `
                        linear-gradient(rgba(79,195,247,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(239,83,80,0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '54px 54px',
                    opacity: 0.12,
                    zIndex: 0,
                },
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: '-18%',
                    background: `
                        radial-gradient(circle at 18% 24%, rgba(79,195,247,0.22), transparent 30%),
                        radial-gradient(circle at 82% 22%, rgba(239,83,80,0.2), transparent 28%),
                        radial-gradient(circle at 50% 78%, rgba(255,203,117,0.14), transparent 26%)
                    `,
                    opacity: 0.38,
                    zIndex: 0,
                    pointerEvents: 'none',
                },
            }}>
                <Box sx={{ width: '100%', maxWidth: 700, position: 'relative', zIndex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="h6" fontWeight={800}>
                                YOVI ARENA
                            <Typography component="span" variant="caption"
                                        sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                                {username} · {yen.variant === 'standard' ? 'Estandar' : 'Why Not'}
                            </Typography>
                            </Typography>
                            <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.5}
                                    sx={{
                                        px: 1,
                                        borderRadius: 2,
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        bgcolor: 'rgba(255,255,255,0.04)',
                                    }}
                                >
                                    <IconButton
                                        aria-label={isMuted ? 'Activar sonido' : 'Silenciar musica'}
                                        onClick={handleToggleMute}
                                        size="small"
                                        sx={{ color: isMuted ? 'rgba(255,255,255,0.45)' : '#fff' }}
                                    >
                                        {isMuted ? <VolumeOff fontSize="small" /> : <MusicNote fontSize="small" />}
                                    </IconButton>
                                </Stack>
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
                                onClick={() => onExit(winner === null)}
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
                        bgcolor: winner !== null ? `${activeColor}24` : `${activeColor}18`,
                        border: `2px solid ${activeColor}`,
                        borderRadius: winner !== null ? 3 : 2,
                        p: winner !== null ? { xs: 2.2, md: 2.8 } : 1.5,
                        textAlign: 'center',
                        mb: 1,
                        boxShadow: winner !== null
                            ? `0 0 10px ${activeColor}22`
                            : 'none',
                    }}>
                        <Typography
                            fontWeight={900}
                            letterSpacing={winner !== null ? 1 : 2}
                            sx={{
                                color: activeColor,
                                fontSize: winner !== null
                                    ? { xs: '1.45rem', md: '2.1rem' }
                                    : '1rem',
                                lineHeight: 1.2,
                                textTransform: 'uppercase',
                            }}
                        >
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
                        <Box sx={{ minWidth: 'fit-content', mx: 'auto' }}>
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
