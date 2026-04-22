import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonGroup,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from '@mui/material';
import { ArrowBack, PlayArrow, SmartToy, People } from '@mui/icons-material';
import type { GameMode } from '../GameBoard';
import { FALLBACK_BOTS, fetchAvailableBots, type BotId, type BotInfo, type GameVariant } from '../GameyApi';

type PreGameMenuProps = {
    username: string;
    mode: GameMode;
    boardSize: number;
    initialVariant: GameVariant;
    initialBotId: BotId;
    onBack: () => void;
    onStart: (opts: { variant: GameVariant; botId: BotId }) => void;
};

function getErrorMessage(e: unknown): string {
    if (typeof e === 'object' && e !== null && 'message' in e) {
        const msg = (e as { message?: unknown }).message;
        if (typeof msg === 'string') return msg;
        // Avoid "[object Object]" noise from default stringification.
        if (msg === null || msg === undefined) return 'Error';
        if (typeof msg === 'number' || typeof msg === 'boolean' || typeof msg === 'bigint') return String(msg);
        try {
            return JSON.stringify(msg);
        } catch {
            return 'Error';
        }
    }
    if (typeof e === 'string') return e;
    if (e === null || e === undefined) return 'Error';
    if (typeof e === 'number' || typeof e === 'boolean' || typeof e === 'bigint') return String(e);
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
}

const VARIANTS: Array<{ id: GameVariant; label: string; desc: string }> = [
    { id: 'standard', label: 'Standard', desc: 'Reglas clasicas. Conecta tus 3 lados.' },
    { id: 'why_not', label: 'Why Not', desc: 'Variante alternativa (mismo tablero, distinto objetivo).' },
];

function groupBots(botList: BotInfo[]) {
    const basicBots = botList.filter((b) => b.tags?.includes('basic'));
    const strategyBots = botList.filter((b) => !b.tags?.includes('basic'));
    return { basicBots, strategyBots };
}

export default function PreGameMenu({
    username,
    mode,
    boardSize,
    initialVariant,
    initialBotId,
    onBack,
    onStart,
}: Readonly<PreGameMenuProps>) {
    const [variant, setVariant] = useState<GameVariant>(initialVariant);
    const [botId, setBotId] = useState<BotId>(initialBotId);
    const [bots, setBots] = useState<BotInfo[] | null>(null);
    const [loadingBots, setLoadingBots] = useState(false);
    const [botsError, setBotsError] = useState<string | null>(null);

    useEffect(() => {
        if (mode !== 'bot') return;
        let cancelled = false;
        const load = async () => {
            setLoadingBots(true);
            setBotsError(null);
            try {
                const data = await fetchAvailableBots();
                if (!cancelled) setBots(data);
            } catch (e) {
                if (!cancelled) setBotsError(getErrorMessage(e) || 'Error de red');
            } finally {
                if (!cancelled) setLoadingBots(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [mode]);

    const botList = bots ?? FALLBACK_BOTS;
    const selectedBot = useMemo(() => botList.find((b) => b.id === botId) ?? null, [botList, botId]);
    const { basicBots, strategyBots } = useMemo(() => groupBots(botList), [botList]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                p: 3,
                color: 'white',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>
                        PRE-PARTIDA
                    </Typography>
                    <Typography variant="h5" fontWeight={900}>
                        {mode === 'bot' ? 'Configura tu rival' : 'Configura la partida'}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                        <Chip
                            size="small"
                            icon={mode === 'bot' ? <SmartToy /> : <People />}
                            label={mode === 'bot' ? 'Vs IA' : 'Local 2 jugadores'}
                            sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }}
                        />
                        <Chip size="small" label={`Tablero: ${boardSize}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                        <Chip size="small" label={`Usuario: ${username}`} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                    </Stack>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBack />}
                    onClick={onBack}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { borderColor: '#4fc3f7', color: '#4fc3f7' },
                    }}
                >
                    Volver
                </Button>
            </Stack>

            <Paper
                sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    p: 3,
                    mb: 3,
                }}
            >
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, letterSpacing: 2 }}>
                    ESTRATEGIA (VARIANTE)
                </Typography>
                <ButtonGroup sx={{ flexWrap: 'wrap' }}>
                    {VARIANTS.map((v) => (
                        <Button
                            key={v.id}
                            onClick={() => setVariant(v.id)}
                            variant={variant === v.id ? 'contained' : 'outlined'}
                            sx={variant === v.id
                                ? { bgcolor: '#4fc3f7', color: '#000' }
                                : { color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
                        >
                            {v.label}
                        </Button>
                    ))}
                </ButtonGroup>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 1 }}>
                    {VARIANTS.find((v) => v.id === variant)?.desc}
                </Typography>
            </Paper>

            {mode === 'bot' && (
                <Paper
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        p: 3,
                        mb: 3,
                    }}
                >
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, letterSpacing: 2 }}>
                        BOT (LISTA)
                    </Typography>

                    {loadingBots && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                            <CircularProgress size={16} sx={{ color: '#4fc3f7' }} />
                            <Typography variant="body2">Cargando bots disponibles...</Typography>
                        </Stack>
                    )}

                    {!loadingBots && botsError && (
                        <Alert severity="warning" sx={{ bgcolor: 'rgba(255,193,7,0.12)', color: '#ffd54f', mb: 2 }}>
                            No se pudo cargar la lista de bots del servidor. Usando opciones por defecto.
                        </Alert>
                    )}

                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', letterSpacing: 2, mb: 1, display: 'block' }}>
                        BASICOS (FACIL / DIFICIL / ALEATORIO)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                        {basicBots.map((b) => (
                            <Paper
                                key={b.id}
                                component="button"
                                onClick={() => setBotId(b.id)}
                                sx={{
                                    bgcolor: botId === b.id ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${botId === b.id ? '#4fc3f7' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 2,
                                    p: 2,
                                    textAlign: 'left',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
                                    '&:hover': { transform: 'translateY(-1px)', borderColor: '#4fc3f7' },
                                }}
                            >
                                <Typography fontWeight={900}>{b.title}</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                    {b.description}
                                </Typography>
                            </Paper>
                        ))}
                    </Box>

                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', letterSpacing: 2, mb: 1, display: 'block' }}>
                        ESTRATEGIAS
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        {strategyBots.map((b) => (
                            <Paper
                                key={b.id}
                                component="button"
                                onClick={() => setBotId(b.id)}
                                sx={{
                                    bgcolor: botId === b.id ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${botId === b.id ? '#4fc3f7' : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: 2,
                                    p: 2,
                                    textAlign: 'left',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
                                    '&:hover': { transform: 'translateY(-1px)', borderColor: '#4fc3f7' },
                                }}
                            >
                                <Typography fontWeight={800}>{b.title}</Typography>
                                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                    {b.description}
                                </Typography>
                            </Paper>
                        ))}
                    </Box>

                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', mt: 1.5, display: 'block' }}>
                        Seleccionado: {selectedBot?.title ?? botId}
                    </Typography>
                </Paper>
            )}

            <Stack direction="row" justifyContent="flex-end" gap={2}>
                <Button
                    variant="contained"
                    size="large"
                    endIcon={<PlayArrow />}
                    onClick={() => onStart({ variant, botId })}
                    sx={{ bgcolor: '#4fc3f7', color: '#000', fontWeight: 900 }}
                >
                    Empezar partida
                </Button>
            </Stack>
        </Box>
    );
}
