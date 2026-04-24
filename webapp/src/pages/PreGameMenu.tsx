import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    ButtonBase,
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
import { AVATAR_OPTIONS } from '../avatars';
import { getErrorMessage } from '../utils/getErrorMessage';

type PreGameMenuProps = {
    username: string;
    mode: GameMode;
    boardSize: number;
    initialVariant: GameVariant;
    initialBotId: BotId;
    initialBlueAvatarId: string;
    initialRedAvatarId: string;
    onBack: () => void;
    onStart: (opts: { variant: GameVariant; botId: BotId; blueAvatarId: string; redAvatarId: string }) => void;
};

const VARIANTS: Array<{ id: GameVariant; label: string; desc: string }> = [
    { id: 'standard', label: 'Standard', desc: 'Reglas clasicas. Conecta tus 3 lados.' },
    { id: 'why_not', label: 'Why Not', desc: 'Haz que el rival conecte sus 3 lados para ganar.' },
];

function groupBots(botList: BotInfo[]) {
    const BASIC_IDS = new Set<BotId>(['side_bot', 'side_bot_hard', 'random_bot']);
    const isBasic = (b: BotInfo) =>
        b.tags?.includes('basic')
        || BASIC_IDS.has(b.id)
        || ['facil', 'difícil', 'dificil', 'aleatorio'].includes((b.title ?? '').trim().toLowerCase());

    const basicBots = botList.filter(isBasic);
    const strategyBots = botList.filter((b) => !isBasic(b));
    return { basicBots, strategyBots };
}

export default function PreGameMenu({
    username,
    mode,
    boardSize,
    initialVariant,
    initialBotId,
    initialBlueAvatarId,
    initialRedAvatarId,
    onBack,
    onStart,
}: Readonly<PreGameMenuProps>) {
    const [variant, setVariant] = useState<GameVariant>(initialVariant);
    const [botId, setBotId] = useState<BotId>(initialBotId);
    const [blueAvatarId, setBlueAvatarId] = useState(initialBlueAvatarId);
    const [redAvatarId, setRedAvatarId] = useState(initialRedAvatarId);
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
                    bgcolor: 'rgba(79,195,247,0.07)',
                    border: '1px solid rgba(79,195,247,0.22)',
                    borderRadius: 3,
                    p: 3,
                    mb: 3,
                    textAlign: 'center',
                }}
            >
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1, letterSpacing: 2 }}>
                    ESTRATEGIA (VARIANTE)
                </Typography>
                <ButtonGroup sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
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

            {mode === 'local' && (
                <Paper
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 3,
                        p: 3,
                        mb: 3,
                    }}
                >
                    <Typography
                        variant="subtitle2"
                        sx={{ color: '#4fc3f7', mb: 2, letterSpacing: 3, textAlign: 'center', fontWeight: 900, textTransform: 'uppercase' }}
                    >
                        Avatares de la partida local
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        {[
                            { team: 'Azul', value: blueAvatarId, setValue: setBlueAvatarId, color: '#4fc3f7' },
                            { team: 'Rojo', value: redAvatarId, setValue: setRedAvatarId, color: '#ef5350' },
                        ].map(({ team, value, setValue, color }) => (
                            <Paper
                                key={team}
                                sx={{
                                    flex: 1,
                                    p: 2,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${color}55`,
                                }}
                            >
                                <Typography sx={{ color, fontWeight: 900, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                    Equipo {team}
                                </Typography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                                    {AVATAR_OPTIONS.map((avatar) => {
                                        const isSelected = value === avatar.id;
                                        return (
                                            <ButtonBase
                                                key={`${team}-${avatar.id}`}
                                                type="button"
                                                aria-label={`Seleccionar avatar ${avatar.label} para ${team}`}
                                                aria-pressed={isSelected}
                                                onClick={() => setValue(avatar.id)}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 0.75,
                                                    p: 1,
                                                    borderRadius: 2,
                                                    border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.12)'}`,
                                                    backgroundColor: isSelected ? `${color}20` : 'rgba(255,255,255,0.02)',
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={avatar.src}
                                                    alt={avatar.label}
                                                    sx={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                                <Typography variant="caption" sx={{ color: 'white', fontWeight: isSelected ? 800 : 500 }}>
                                                    {avatar.label}
                                                </Typography>
                                            </ButtonBase>
                                        );
                                    })}
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                </Paper>
            )}

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
                    <Typography
                        variant="subtitle2"
                        sx={{
                            color: '#ff4159',
                            mb: 2,
                            letterSpacing: 3,
                            textAlign: 'center',
                            fontWeight: 950,
                            textTransform: 'uppercase',
                            textShadow: '0 0 10px rgba(255, 65, 89, 0.35)',
                        }}
                    >
                        Lista de bots: escoge uno
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

                    <Paper
                        sx={{
                            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(33, 150, 243, 0.10))',
                            border: '1px solid rgba(0, 229, 255, 0.30)',
                            borderRadius: 2.5,
                            p: 2,
                            mb: 2,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 2, mb: 1, display: 'block', textAlign: 'center', fontWeight: 900 }}
                        >
                            BASICOS
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                            {basicBots.map((b) => (
                                <Paper
                                    key={b.id}
                                    component="button"
                                    onClick={() => setBotId(b.id)}
                                    sx={{
                                        bgcolor: botId === b.id ? 'rgba(255, 203, 117, 0.18)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${botId === b.id ? '#ffcb75' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: 2,
                                        p: 2,
                                        textAlign: 'left',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
                                        '&:hover': { transform: 'translateY(-1px)', borderColor: '#ffcb75' },
                                    }}
                                >
                                    <Typography fontWeight={900}>{b.title}</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                        {b.description}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>

                    <Paper
                        sx={{
                            bgcolor: 'rgba(79,195,247,0.07)',
                            border: '1px solid rgba(79,195,247,0.20)',
                            borderRadius: 2.5,
                            p: 2,
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 2, mb: 1, display: 'block', textAlign: 'center', fontWeight: 900 }}
                        >
                            ESTRATEGIAS
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                            {strategyBots.map((b) => (
                            <Paper
                                key={b.id}
                                component="button"
                                onClick={() => setBotId(b.id)}
                                sx={{
                                        bgcolor: botId === b.id ? 'rgba(255, 203, 117, 0.18)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${botId === b.id ? '#ffcb75' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: 2,
                                        p: 2,
                                        textAlign: 'left',
                                        color: 'white',
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s, border-color 0.15s, background-color 0.15s',
                                        '&:hover': { transform: 'translateY(-1px)', borderColor: botId === b.id ? '#ffcb75' : '#4fc3f7' },
                                    }}
                                >
                                    <Typography fontWeight={800}>{b.title}</Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                        {b.description}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    </Paper>

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
                    onClick={() => onStart({ variant, botId, blueAvatarId, redAvatarId })}
                    sx={{ bgcolor: '#4fc3f7', color: '#000', fontWeight: 900 }}
                >
                    Empezar partida
                </Button>
            </Stack>
        </Box>
    );
}
