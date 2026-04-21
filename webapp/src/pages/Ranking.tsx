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
import { ArrowBack, BarChart } from '@mui/icons-material';
import { fetchPersonalStats, type PersonalStats } from '../UsersApi';

type RankingProps = {
    username: string;
    onBack: () => void;
};

type StatCardProps = {
    label: string;
    value: string | number;
    color: string;
};

function StatCard({ label, value, color }: StatCardProps) {
    return (
        <Paper
            elevation={2}
            sx={{
                p: 2,
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.03)',
                border: `1px solid ${color}55`,
                borderRadius: 2,
                minWidth: 140,
            }}
        >
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5 }}>
                {label}
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1, mt: 1 }}>
                {value}
            </Typography>
        </Paper>
    );
}

export default function Ranking({ username, onBack }: RankingProps) {
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchPersonalStats(username);
                if (!cancelled) setStats(data);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Error de red');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [username]);

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
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box>
                        <Typography variant="overline"
                                    sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>
                            PERSONAL
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                            <BarChart sx={{ mr: 1, color: '#4fc3f7', verticalAlign: 'middle' }} />
                            Estadísticas personales
                        </Typography>
                        <Typography variant="caption"
                                    sx={{ color: 'rgba(255,255,255,0.45)', letterSpacing: 2 }}>
                            {username}
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

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress sx={{ color: '#4fc3f7' }} />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error"
                           sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b', mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {!loading && !error && stats && (
                    <Stack spacing={2}>
                        <Paper
                            elevation={2}
                            sx={{
                                p: 2.5,
                                backgroundColor: 'rgba(79,195,247,0.08)',
                                border: '1px solid rgba(79,195,247,0.25)',
                                borderRadius: 2,
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                Resumen de cuenta
                            </Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                                {stats.username}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', mt: 1 }}>
                                {stats.rankingPosition === null
                                    ? 'Todavía no apareces en el ranking global.'
                                    : `Puesto actual en el ranking global: #${stats.rankingPosition}`}
                            </Typography>
                        </Paper>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <StatCard label="PARTIDAS" value={stats.totalGames} color="#ffffff" />
                            <StatCard label="VICTORIAS" value={stats.wins} color="#4fc3f7" />
                            <StatCard label="DERROTAS" value={stats.losses} color="#ef5350" />
                            <StatCard label="RATIO" value={`${stats.winRate}%`} color="#ffd54f" />
                        </Stack>
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
