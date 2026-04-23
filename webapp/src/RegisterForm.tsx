import { useState, type FormEvent, type MouseEvent } from 'react';
import {
  Box,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

type RegisterFormProps = {
  onAuthSuccess: (username: string) => void;
  initialMode?: AuthMode;
};

type AuthMode = 'login' | 'register';

const RegisterForm = ({ onAuthSuccess, initialMode = 'login' }: RegisterFormProps) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleModeChange = (_event: MouseEvent<HTMLElement>, value: AuthMode | null) => {
    if (value) {
      setMode(value);
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim()) { setError('Please enter a username.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const endpoint = mode === 'register' ? 'register' : 'login';
      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.username ?? username.trim());
        setUsername(''); setPassword(''); setConfirmPassword('');
      } else {
        setError(data.error || 'Server error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Box component="h2" sx={{ m: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            {mode === 'register' ? 'Register' : 'Log in'}
          </Box>
        </Box>
        {/* Toggle login / register */}
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          fullWidth
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'rgba(255,255,255,0.5)',
              borderColor: 'rgba(255,255,255,0.15)',
              '&.Mui-selected': {
                bgcolor: 'rgba(79,195,247,0.15)',
                color: '#4fc3f7',
                borderColor: '#4fc3f7',
              },
            },
          }}
        >
          <ToggleButton value="login">Log in</ToggleButton>
          <ToggleButton value="register">Register</ToggleButton>
        </ToggleButtonGroup>

        {/* Username */}
        <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="small"
            fullWidth
            variant="outlined"
            slotProps={{
              inputLabel: { style: { color: 'rgba(255,255,255,0.5)' } },
              input: { style: { color: 'white' } },
            }}
            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
        />

        {/* Password */}
        <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            fullWidth
            variant="outlined"
            slotProps={{
              inputLabel: { style: { color: 'rgba(255,255,255,0.5)' } },
              input: {
                style: { color: 'white' },
                endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={() => setShowPassword((current) => !current)}
                          edge="end"
                          sx={{ color: 'rgba(255,255,255,0.65)' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                ),
              },
            }}
            sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
        />

        {/* Confirm password */}
        {mode === 'register' && (
            <TextField
                label="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
                slotProps={{
                  inputLabel: { style: { color: 'rgba(255,255,255,0.5)' } },
                  input: {
                    style: { color: 'white' },
                    endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                              aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                              onClick={() => setShowConfirmPassword((current) => !current)}
                              edge="end"
                              sx={{ color: 'rgba(255,255,255,0.65)' }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                    ),
                  },
                }}
                sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' } } }}
            />
        )}

        {/* Submit */}
        <Button
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth
            sx={{
              background: 'linear-gradient(90deg, #4fc3f7, #e040fb)',
              color: 'white',
              fontWeight: 700,
              letterSpacing: 1,
              '&:hover': { opacity: 0.9 },
            }}
        >
          {loading
              ? <CircularProgress size={20} color="inherit" />
              : mode === 'register' ? 'Create account' : 'Enter'
          }
        </Button>

        {/* Error */}
        {error && (
            <Alert severity="error" sx={{ bgcolor: 'rgba(211,47,47,0.15)', color: '#ff6b6b' }}>
              {error}
            </Alert>
        )}
      </Box>
  );
};

export default RegisterForm;
