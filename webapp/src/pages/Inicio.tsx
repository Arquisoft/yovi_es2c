import { Box, Typography, Chip, Stack, Paper } from '@mui/material';
import { SportsSoccer, Wifi, EmojiEvents } from '@mui/icons-material';
import RegisterForm from '../RegisterForm';

type InicioProps = {
    onEntrar: (username: string) => void;
    initialAuthMode?: 'login' | 'register';
};

export default function Inicio({ onEntrar, initialAuthMode = 'login' }: InicioProps) {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
            }}
        >
            <Paper
                elevation={24}
                sx={{
                    maxWidth: 480,
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    p: 4,
                    color: 'white',
                }}
            >
                {/* Badge */}
                <Chip
                    label="● SEASON LIVE"
                    size="small"
                    sx={{
                        bgcolor: 'rgba(255, 59, 59, 0.2)',
                        color: '#ff6b6b',
                        border: '1px solid #ff6b6b',
                        fontWeight: 700,
                        letterSpacing: 1,
                        mb: 2,
                    }}
                />

                {/* Title */}
                <Typography
                    variant="h3"
                    fontWeight={900}
                    letterSpacing={2}
                    sx={{
                        background: 'linear-gradient(90deg, #4fc3f7, #e040fb)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1,
                    }}
                >
                    YOVI ARENA
                </Typography>

                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 3 }}>
                    Tablero triangular, bolas rojas y azules, y pura precisión en cada jugada.
                </Typography>

                {/* Board image */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mb: 3,
                        '& img': { width: 140, opacity: 0.9 },
                    }}
                >
                    <img src="/tri-billiard.svg" alt="Tablero triangular" />
                </Box>

                {/* Chips info */}
                <Stack direction="row" spacing={1} flexWrap="wrap" mb={3}>
                    <Chip icon={<SportsSoccer />} label="12.8K jugadores" size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                    <Chip icon={<Wifi />} label="Servidor online" size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                    <Chip icon={<EmojiEvents />} label="Modo competitivo" size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white' }} />
                </Stack>

                {/* Form */}
                <RegisterForm onAuthSuccess={onEntrar} initialMode={initialAuthMode} />
            </Paper>
        </Box>
    );
}
