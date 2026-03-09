import React, { useState } from 'react';

type RegisterFormProps = {
  onAuthSuccess: (username: string) => void;
};

type AuthMode = 'login' | 'register';

const RegisterForm: React.FC<RegisterFormProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const API_URL =
          import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const endpoint = mode === 'register' ? 'register' : 'login';

      const res = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        const cleanUsername = data.username ?? username.trim();
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        onAuthSuccess(cleanUsername);
      } else {
        setError(data.error || 'Server error');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <form onSubmit={handleSubmit} className="register-form">
        <div className="auth-mode-toggle" role="group" aria-label="Authentication mode">
          <button
              type="button"
              onClick={() => setMode('login')}
              className={`auth-mode-button ${mode === 'login' ? 'auth-mode-button--active' : ''}`}
          >
            Log in
          </button>
          <button
              type="button"
              onClick={() => setMode('register')}
              className={`auth-mode-button ${mode === 'register' ? 'auth-mode-button--active' : ''}`}
          >
            Register
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
          />
        </div>

        {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
              />
            </div>
        )}

        <button
            type="submit"
            className="submit-button"
            disabled={loading}
        >
          {loading ? 'Checking...' : mode === 'register' ? 'Create account' : 'Enter'}
        </button>

        {error && (
            <div
                className="error-message"
            >
              {error}
            </div>
        )}
      </form>
  );
};

export default RegisterForm;
