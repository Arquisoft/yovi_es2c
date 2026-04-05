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
} from '@mui/material';
import { ArrowBack, EmojiEvents } from '@mui/icons-material';
import { fetchRanking, type RankingEntry } from '../UsersApi';

type RankingProps = {
    username: string;
    onBack: () => void;
};

// Colores y medallas para las 3 primeras posiciones
const POSITION_STYLE: Record<number, { color: string; medal: string }> = {
    1: { color: '#ffd54f', medal: '🥇' },
    2: { color: '#b0bec5', medal: '🥈' },
    3: { color: '#ff8a65', medal: '🥉' },
};

export default function Ranking({ username, onBack }: RankingProps) {
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchRanking();
                if (!cancelled) setRanking(data);
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="overline"
                                    sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>
                            GLOBAL
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                            <EmojiEvents sx={{ mr: 1, color: '#ffd54f', verticalAlign: 'middle' }} />
                            Ranking
                            <Typography component="span" variant="caption"
                                        sx={{ ml: 1, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                                {username}
                            </Typography>
                        </Typography>
                    </Box>
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
                {error && (
                    <Alert severity="error"
                           sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b', mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Empty */}
                {!loading && !error && ranking.length === 0 && (
                    <Typography variant="body1" sx={{ opacity: 0.5, textAlign: 'center', mt: 4 }}>
                        Todavía no hay jugadores en el ranking.
                    </Typography>
                )}

                {/* Ranking list */}
                <Stack spacing={1.5}>
                    {ranking.map((entry) => {
                        const posStyle = POSITION_STYLE[entry.position];
                        const isCurrentUser = entry.username === username;

                        return (
                            <Paper
                                key={entry.username}
                                elevation={2}
                                sx={{
                                    p: 2,
                                    backgroundColor: isCurrentUser
                                        ? 'rgba(79,195,247,0.08)'
                                        : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${isCurrentUser
                                        ? 'rgba(79,195,247,0.3)'
                                        : posStyle
                                            ? `${posStyle.color}40`
                                            : 'rgba(255,255,255,0.06)'}`,
                                    borderRadius: 2,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: isCurrentUser
                                            ? 'rgba(79,195,247,0.12)'
                                            : 'rgba(255,255,255,0.06)',
                                    },
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2}>

                                    {/* Posición */}
                                    <Box sx={{
                                        minWidth: 40,
                                        textAlign: 'center',
                                        fontSize: posStyle ? '1.5rem' : '1rem',
                                        color: posStyle ? posStyle.color : 'rgba(255,255,255,0.3)',
                                        fontWeight: 800,
                                    }}>
                                        {posStyle ? posStyle.medal : `#${entry.position}`}
                                    </Box>

                                    {/* Nombre */}
                                    <Box sx={{ flex: 1 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography variant="subtitle1" fontWeight={700}
                                                        sx={{ color: isCurrentUser ? '#4fc3f7' : 'white' }}>
                                                {entry.username}
                                            </Typography>
                                            {isCurrentUser && (
                                                <Chip label="Tú" size="small" sx={{
                                                    bgcolor: 'rgba(79,195,247,0.15)',
                                                    color: '#4fc3f7',
                                                    border: '1px solid #4fc3f7',
                                                    height: 20,
                                                    fontSize: '0.65rem',
                                                }} />
                                            )}
                                        </Stack>
                                        <Typography variant="caption"
                                                    sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                            {entry.wins + entry.losses} partidas jugadas
                                        </Typography>
                                    </Box>

                                    {/* Stats */}
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box textAlign="center">
                                            <Typography variant="h6" fontWeight={800}
                                                        sx={{ color: '#4fc3f7', lineHeight: 1 }}>
                                                {entry.wins}
                                            </Typography>
                                            <Typography variant="caption"
                                                        sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                                victorias
                                            </Typography>
                                        </Box>
                                        <Box textAlign="center">
                                            <Typography variant="h6" fontWeight={800}
                                                        sx={{ color: '#ef5350', lineHeight: 1 }}>
                                                {entry.losses}
                                            </Typography>
                                            <Typography variant="caption"
                                                        sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                                derrotas
                                            </Typography>
                                        </Box>
                                        <Box textAlign="center">
                                            <Typography variant="h6" fontWeight={800}
                                                        sx={{ color: '#ffd54f', lineHeight: 1 }}>
                                                {entry.winRate}%
                                            </Typography>
                                            <Typography variant="caption"
                                                        sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                                ratio
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        </Box>
    );
}