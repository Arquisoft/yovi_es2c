import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    CircularProgress,
    Alert,
    Tabs,
    Tab,
    Chip,
} from '@mui/material';
import { ArrowBack, BarChart, EmojiEvents } from '@mui/icons-material';
import { fetchRanking, fetchPersonalStats, type RankingEntry, type PersonalStats } from '../UsersApi';

type RankingProps = {
    username: string;
    onBack: () => void;
    initialTab?: number;
};

type StatCardProps = {
    label: string;
    value: string | number;
    color: string;
};

const POSITION_STYLE: Record<number, { color: string; medal: string }> = {
    1: { color: '#ffd54f', medal: '🥇' },
    2: { color: '#b0bec5', medal: '🥈' },
    3: { color: '#ff8a65', medal: '🥉' },
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

export default function Ranking({ username, onBack, initialTab = 0 }: RankingProps) {
    const [tab, setTab] = useState(initialTab);
    const [ranking, setRanking] = useState<RankingEntry[]>([]);
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [rankingData, statsData] = await Promise.all([
                    fetchRanking(),
                    fetchPersonalStats(username)
                ]);
                if (!cancelled) {
                    setRanking(rankingData);
                    setStats(statsData);
                }
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
                            {tab === 0 ? 'GLOBAL' : 'PERSONAL'}
                        </Typography>
                        <Typography variant="h6" fontWeight={800}>
                            {tab === 0 ? (
                                <><EmojiEvents sx={{ mr: 1, color: '#ffd54f', verticalAlign: 'middle' }} /> Ranking Global</>
                            ) : (
                                <><BarChart sx={{ mr: 1, color: '#4fc3f7', verticalAlign: 'middle' }} /> Estadísticas personales</>
                            )}
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

                <Tabs
                    value={tab}
                    onChange={(_, val) => setTab(val)}
                    sx={{
                        mb: 3,
                        '& .MuiTabs-indicator': { bgcolor: '#4fc3f7' },
                        '& .MuiTab-root': { color: 'rgba(255,255,255,0.4)' },
                        '& .Mui-selected': { color: '#4fc3f7 !important' }
                    }}
                    centered
                >
                    <Tab label="Ranking" />
                    <Tab label="Mis Estadísticas" />
                </Tabs>

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

                {!loading && !error && (
                    tab === 0 ? (
                        <Stack spacing={1.5}>
                            {ranking.length === 0 ? (
                                <Typography variant="body1" sx={{ opacity: 0.5, textAlign: 'center', mt: 4 }}>
                                    Todavía no hay jugadores en el ranking.
                                </Typography>
                            ) : (
                                ranking.map((entry) => {
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
                                            }}
                                        >
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{
                                                    minWidth: 40,
                                                    textAlign: 'center',
                                                    fontSize: posStyle ? '1.5rem' : '1rem',
                                                    color: posStyle ? posStyle.color : 'rgba(255,255,255,0.3)',
                                                    fontWeight: 800,
                                                }}>
                                                    {posStyle ? posStyle.medal : `#${entry.position}`}
                                                </Box>
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
                                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                                        {entry.wins + entry.losses} partidas jugadas
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={2}>
                                                    <Box textAlign="center">
                                                        <Typography variant="body1" fontWeight={800} sx={{ color: '#4fc3f7' }}>{entry.wins}</Typography>
                                                        <Typography variant="caption" sx={{ opacity: 0.5 }}>W</Typography>
                                                    </Box>
                                                    <Box textAlign="center">
                                                        <Typography variant="body1" fontWeight={800} sx={{ color: '#ef5350' }}>{entry.losses}</Typography>
                                                        <Typography variant="caption" sx={{ opacity: 0.5 }}>L</Typography>
                                                    </Box>
                                                </Stack>
                                            </Stack>
                                        </Paper>
                                    );
                                })
                            )}
                        </Stack>
                    ) : (
                        stats && (
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
                        )
                    )
                )}
            </Box>
        </Box>
    );
}
