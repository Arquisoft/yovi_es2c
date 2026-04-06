import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    People,
    SmartToy,
    EmojiEvents,
    GpsFixed,
    PowerSettingsNew,
    History,
    Leaderboard,
} from '@mui/icons-material';
import type { GameMode } from '../GameBoard';

const BOARD_SIZE_OPTIONS = [5, 7, 9] as const;

type MenuProps = {
    onLogout: () => void;
    initialUsername: string;
    onJugar: (username: string, mode: GameMode, boardSize: number) => void;
    onVerHistorial: () => void;
    onVerRanking: () => void;
};

const CARDS = [
    {
        mode: 'local' as GameMode,
        icon: <People sx={{ fontSize: 40 }} />,
        title: 'Partida Local',
        subtitle: '2 jugadores en la misma pantalla',
        color: '#4fc3f7',
        disabled: false,
    },
    {
        mode: 'bot' as GameMode,
        icon: <SmartToy sx={{ fontSize: 40 }} />,
        title: 'Vs IA Bot',
        subtitle: 'Juega contra el motor de Gamey',
        color: '#ef5350',
        disabled: false,
    },
    {
        mode: 'local' as GameMode,
        icon: <EmojiEvents sx={{ fontSize: 40 }} />,
        title: 'Liga Ranked',
        subtitle: 'Próximamente',
        color: '#ffd54f',
        disabled: true,
    },
    {
        mode: 'local' as GameMode,
        icon: <GpsFixed sx={{ fontSize: 40 }} />,
        title: 'Misiones Diarias',
        subtitle: 'Próximamente',
        color: '#4dd0e1',
        disabled: true,
    },
];

export default function Menu({ onLogout, onJugar, initialUsername, onVerHistorial, onVerRanking }: MenuProps) {
    const [boardSize, setBoardSize] = useState<number>(7);

    const launch = (mode: GameMode) => {
        onJugar(initialUsername || 'Jugador', mode, boardSize);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                p: 3,
                color: 'white',
            }}
        >
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>
                        GAME LOBBY
                    </Typography>
                    <Typography variant="h4" fontWeight={800}>
                        Elige Tu Modo
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<PowerSettingsNew />}
                    onClick={onLogout}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { borderColor: '#ef5350', color: '#ef5350' },
                    }}
                >
                    Desconectar
                </Button>
            </Stack>

            {/* Board size picker */}
            <Paper
                sx={{
                    bgcolor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    p: 3,
                    mb: 4,
                }}
            >
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 2, letterSpacing: 2 }}>
                    TAMAÑO DEL TABLERO
                </Typography>
                <ToggleButtonGroup
                    value={boardSize}
                    exclusive
                    onChange={(_, val) => val && setBoardSize(val)}
                    sx={{
                        '& .MuiToggleButton-root': {
                            color: 'rgba(255,255,255,0.5)',
                            borderColor: 'rgba(255,255,255,0.15)',
                            px: 4,
                            '&.Mui-selected': {
                                bgcolor: 'rgba(79,195,247,0.15)',
                                color: '#4fc3f7',
                                borderColor: '#4fc3f7',
                            },
                        },
                    }}
                >
                    {BOARD_SIZE_OPTIONS.map((size) => (
                        <ToggleButton
                            key={size}
                            value={size}
                            aria-pressed={boardSize === size}
                        >
                            {size}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 1, display: 'block' }}>
                    Lados del triángulo: {boardSize} celdas
                </Typography>
            </Paper>

            {/* Mode cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                    mb: 4,
                }}
            >
                {CARDS.map((card) => (
                    <Paper
                        key={card.title}
                        component="button"
                        onClick={() => !card.disabled && launch(card.mode)}
                        disabled={card.disabled}
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${card.disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: 3,
                            p: 3,
                            cursor: card.disabled ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            color: card.disabled ? 'rgba(255,255,255,0.3)' : 'white',
                            transition: 'all 0.2s',
                            '&:hover': card.disabled ? {} : {
                                bgcolor: `${card.color}18`,
                                borderColor: card.color,
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        <Box sx={{ color: card.disabled ? 'rgba(255,255,255,0.2)' : card.color, mb: 1 }}>
                            {card.icon}
                        </Box>
                        <Typography variant="h6" fontWeight={700}>{card.title}</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            {card.subtitle}
                        </Typography>
                    </Paper>
                ))}
            </Box>

            {/* Footer buttons */}
            <Stack direction="row" justifyContent="center" gap={2}>
                <Button
                    variant="outlined"
                    startIcon={<History />}
                    onClick={onVerHistorial}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { borderColor: '#7c4dff', color: '#7c4dff' },
                    }}
                >
                    Historial
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Leaderboard />}
                    onClick={onVerRanking}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': { borderColor: '#ffd54f', color: '#ffd54f' },
                    }}
                >
                    Ranking
                </Button>
            </Stack>
        </Box>
    );
}