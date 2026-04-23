import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    CircularProgress,
    Alert,
    Chip,
    useMediaQuery,
} from '@mui/material';
import { ArrowBack, SportsEsports } from '@mui/icons-material';
import { fetchGameHistory, type HistoryGame } from '../GameyApi';

type HistorialProps = {
    username: string;
    onBack: () => void;
};

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('es-ES');
}

function formatWinner(winner: string | null): string {
    if (winner === null) return 'N/A';
    if (winner === '0') return 'AZUL';
    if (winner === '1') return 'ROJO';
    return winner;
}

function winnerGlow(winner: string | null) {
    if (winner === '0') return '#3b82f6'; // azul neon
    if (winner === '1') return '#ff2d55'; // rojo neon
    return '#9ca3af';
}

export default function Historial({ username, onBack }: HistorialProps) {
    const [games, setGames] = useState<HistoryGame[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const dark = useMediaQuery('(prefers-color-scheme: dark)');

    useEffect(() => {
        let cancel = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchGameHistory(username);
                if (!cancel) setGames(data);
            } catch (e) {
                if (!cancel)
                    setError(e instanceof Error ? e.message : 'Error');
            } finally {
                if (!cancel) setLoading(false);
            }
        };

        load();
        return () => {
            cancel = true;
        };
    }, [username]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                px: 2,
                py: 3,
                display: 'flex',
                justifyContent: 'center',
                background: dark
                    ? 'radial-gradient(circle at top, #0f172a, #020617 70%)'
                    : 'linear-gradient(135deg, #e0f2fe, #f8fafc)',
                color: dark ? '#fff' : '#0f172a',
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 780 }}>

                {/* HEADER */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            HISTORIAL
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {username}
                        </Typography>
                    </Box>

                    <Button
                        onClick={onBack}
                        startIcon={<ArrowBack />}
                        sx={{
                            borderRadius: 3,
                            px: 2,
                            color: '#3b82f6',
                            border: '1px solid rgba(59,130,246,0.5)',
                            backdropFilter: 'blur(10px)',
                            background: 'rgba(59,130,246,0.08)',
                            '&:hover': {
                                background: 'rgba(255,45,85,0.1)',
                                borderColor: '#ff2d55',
                                color: '#ff2d55',
                            },
                        }}
                    >
                        Volver
                    </Button>
                </Stack>

                {/* LOADING */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                        <CircularProgress sx={{ color: '#3b82f6' }} />
                    </Box>
                )}

                {/* ERROR */}
                {!loading && error && (
                    <Alert
                        severity="error"
                        sx={{
                            mb: 2,
                            background: 'rgba(255,45,85,0.1)',
                            color: '#ff2d55',
                        }}
                    >
                        {error}
                    </Alert>
                )}

                {/* EMPTY */}
                {!loading && !error && games.length === 0 && (
                    <Box sx={{ textAlign: 'center', mt: 8, opacity: 0.6 }}>
                        <SportsEsports sx={{ fontSize: 70, color: '#3b82f6' }} />
                        <Typography fontWeight={700}>
                            No hay partidas aún
                        </Typography>
                    </Box>
                )}

                {/* LIST */}
                <Stack spacing={1.5}>
                    {games.map((g, i) => (
                        <Paper
                            key={i}
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                background: dark
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${
                                    g.winner === '1'
                                        ? 'rgba(255,45,85,0.3)'
                                        : 'rgba(59,130,246,0.3)'
                                }`,
                                boxShadow:
                                    g.winner === '1'
                                        ? '0 0 20px rgba(255,45,85,0.15)'
                                        : '0 0 20px rgba(59,130,246,0.15)',
                                transition: '0.25s',
                                '&:hover': {
                                    transform: 'scale(1.01)',
                                    boxShadow:
                                        g.winner === '1'
                                            ? '0 0 25px rgba(255,45,85,0.3)'
                                            : '0 0 25px rgba(59,130,246,0.3)',
                                },
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between">

                                <Box>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                        {formatDate(g.timestamp)}
                                    </Typography>

                                    <Typography>
                                        Ganador:{' '}
                                        <strong style={{ color: winnerGlow(g.winner) }}>
                                            {formatWinner(g.winner)}
                                        </strong>
                                    </Typography>
                                </Box>

                                <Stack direction="row" spacing={1}>
                                    <Chip
                                        label={`Tablero ${g.board_size}`}
                                        size="small"
                                        sx={{
                                            background: 'rgba(59,130,246,0.15)',
                                            color: '#3b82f6',
                                        }}
                                    />
                                    <Chip
                                        label={`${g.duration_seconds}s`}
                                        size="small"
                                        sx={{
                                            background: 'rgba(255,45,85,0.15)',
                                            color: '#ff2d55',
                                        }}
                                    />
                                </Stack>

                            </Stack>
                        </Paper>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
