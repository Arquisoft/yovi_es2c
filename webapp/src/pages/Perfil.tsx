import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    ButtonBase,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { AVATAR_OPTIONS, getAvatarById } from '../avatars';

type PerfilProps = {
    username: string;
    avatarId: string;
    onSelectAvatar: (avatarId: string) => void;
    onBack: () => void;
};

export default function Perfil({ username, avatarId, onSelectAvatar, onBack }: PerfilProps) {
    const [currentAvatarId, setCurrentAvatarId] = useState(avatarId);
    const selectedAvatar = getAvatarById(currentAvatarId);

    useEffect(() => {
        setCurrentAvatarId(avatarId);
    }, [avatarId]);

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
                color: 'white',
                p: 3,
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 920, mx: 'auto' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
                    <Box>
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>
                            PERFIL
                        </Typography>
                        <Typography variant="h4" fontWeight={900}>
                            Elige Tu Avatar
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBack />}
                        onClick={onBack}
                        sx={{
                            borderColor: 'rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.7)',
                        }}
                    >
                        Volver
                    </Button>
                </Stack>

                <Paper
                    sx={{
                        p: 4,
                        borderRadius: 4,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            textAlign: 'center',
                            fontWeight: 900,
                            color: '#4fc3f7',
                            mb: 1,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}
                    >
                        {selectedAvatar.label}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            textAlign: 'center',
                            color: 'rgba(255,255,255,0.58)',
                            mb: 4,
                            fontWeight: 700,
                        }}
                    >
                        @{username}
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                            gap: 2,
                        }}
                    >
                        {AVATAR_OPTIONS.map((avatar) => {
                            const isSelected = avatar.id === currentAvatarId;

                            return (
                                <Tooltip key={avatar.id} title={avatar.label}>
                                    <ButtonBase
                                        type="button"
                                        aria-label={`Seleccionar avatar ${avatar.label}`}
                                        aria-pressed={isSelected}
                                        onClick={() => {
                                            setCurrentAvatarId(avatar.id);
                                            onSelectAvatar(avatar.id);
                                        }}
                                        focusRipple
                                        sx={{
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: 1.5,
                                            width: '100%',
                                            minHeight: 210,
                                            px: 2,
                                            py: 2.5,
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                            border: isSelected ? '2px solid #4fc3f7' : '1px solid rgba(255,255,255,0.14)',
                                            background: isSelected ? 'rgba(79,195,247,0.15)' : 'rgba(255,255,255,0.04)',
                                            boxShadow: isSelected ? '0 0 0 4px rgba(79,195,247,0.12)' : 'none',
                                            transition: 'transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                borderColor: '#4fc3f7',
                                                backgroundColor: 'rgba(79,195,247,0.1)',
                                            },
                                            '&:active': {
                                                transform: 'scale(0.96)',
                                            },
                                            '&.Mui-focusVisible': {
                                                outline: 'none',
                                                boxShadow: '0 0 0 4px rgba(255,255,255,0.16)',
                                            },
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={avatar.src}
                                            alt={avatar.label}
                                            sx={{
                                                width: 120,
                                                height: 120,
                                                display: 'block',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                            }}
                                        />
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 900,
                                                fontSize: { xs: '1.05rem', sm: '1.25rem' },
                                                letterSpacing: 0.8,
                                                color: isSelected ? '#4fc3f7' : 'white',
                                                textTransform: 'uppercase',
                                                textAlign: 'center',
                                                lineHeight: 1.1,
                                                textShadow: isSelected ? '0 0 18px rgba(79,195,247,0.28)' : 'none',
                                            }}
                                        >
                                            {avatar.label}
                                        </Typography>
                                        {isSelected && (
                                            <CheckCircle
                                                sx={{
                                                    position: 'absolute',
                                                    right: 10,
                                                    top: 10,
                                                    fontSize: 22,
                                                    color: '#4fc3f7',
                                                    bgcolor: '#0f172a',
                                                    borderRadius: '50%',
                                                }}
                                            />
                                        )}
                                    </ButtonBase>
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
