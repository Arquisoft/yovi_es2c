import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    CircularProgress,
    Alert,
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
    if (winner === '0') return 'Azul';
    if (winner === '1') return 'Rojo';
    return winner;
}

export default function Historial({ username, onBack }: HistorialProps) {
    const [games, setGames] = useState<HistoryGame[]>([]);
    const [loading, setLoading] = useState(true); // true desde el inicio
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchGameHistory();
                if (!cancelled) setGames(data);
            } catch (e) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : 'Error de red');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return (
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

                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={800}>
                        Historial de partidas
                        <Typography component="span" variant="caption"
                                    sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                            {username}
                        </Typography>
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<ArrowBack />}
                        onClick={onBack}
                        sx={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.15)' }}
                        variant="outlined"
                    >
                        Volver
                    </Button>
                </Stack>

                {/* Loading */}
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress sx={{ color: '#4fc3f7' }} />
                    </Box>
                )}

                {/* Error */}
                {!loading && error && (
                    <Alert severity="error"
                           sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b', mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Empty state */}
                {!loading && !error && games.length === 0 && (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        mt: 8,
                        opacity: 0.5,
                    }}>
                        <SportsEsports sx={{ fontSize: 64 }} />
                        <Typography variant="h6" fontWeight={700}>
                            Todavía no hay partidas registradas.
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Juega tu primera partida para verla aquí.
                        </Typography>
                    </Box>
                )}

                {/* Game list */}
                {!loading && !error && games.length > 0 && (
                    <Stack spacing={1.5}>
                        {games.map((g, idx) => (
                            <Paper
                                key={idx}
                                elevation={2}
                                sx={{
                                    p: 1.5,
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 2,
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                                            {formatDate(g.timestamp)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Ganador: {formatWinner(g.winner)}
                                        </Typography>
                                    </Box>
                                    <Box textAlign="right">
                                        <Typography variant="body2">
                                            Tamaño: {g.board_size}
                                        </Typography>
                                        <Typography variant="body2">
                                            Duración: {g.duration_seconds}s
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
