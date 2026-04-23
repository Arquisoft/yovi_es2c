import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react';
import RegisterForm from '../RegisterForm';

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a validation error when username is empty', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onAuthSuccess={() => {}} />);

    await act(async () => {
      await user.type(screen.getByLabelText(/password/i), '123456');
      await user.click(screen.getByRole('button', { name: /enter/i }));
    });

    expect(await screen.findByText(/please enter a username/i)).toBeInTheDocument();
  });

  it('shows a validation error when password is too short', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onAuthSuccess={() => {}} />);

    await act(async () => {
      await user.type(screen.getByLabelText(/username/i), 'Pablo');
      await user.type(screen.getByLabelText(/password/i), '123');
      await user.click(screen.getByRole('button', { name: /enter/i }));
    });

    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });

  it('in register mode validates that passwords match', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onAuthSuccess={() => {}} />);

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /register/i }));
      await user.type(screen.getByLabelText(/^username$/i), 'Pablo');
      await user.type(screen.getByLabelText(/^password$/i), '123456');
      await user.type(screen.getByLabelText(/confirm password/i), '654321');
      await user.click(screen.getByRole('button', { name: /create account/i }));
    });

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('permite mostrar y ocultar la contraseña con el icono de ojo', async () => {
    const user = userEvent.setup();
    render(<RegisterForm onAuthSuccess={() => {}} />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /mostrar contraseña/i }));
    });

    expect(passwordInput).toHaveAttribute('type', 'text');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /ocultar contraseña/i }));
    });

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls onAuthSuccess when login succeeds', async () => {
    const user = userEvent.setup();
    const onAuthSuccess = vi.fn();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'Pablo' }),
    } as Response);

    render(<RegisterForm onAuthSuccess={onAuthSuccess} />);

    await act(async () => {
      await user.type(screen.getByLabelText(/username/i), 'Pablo');
      await user.type(screen.getByLabelText(/password/i), '123456');
      await user.click(screen.getByRole('button', { name: /enter/i }));
    });

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith('Pablo');
      expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/login'),
          expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('shows backend error message when login fails', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response);

    render(<RegisterForm onAuthSuccess={() => {}} />);

    await act(async () => {
      await user.type(screen.getByLabelText(/username/i), 'Pablo');
      await user.type(screen.getByLabelText(/password/i), 'wrong123');
      await user.click(screen.getByRole('button', { name: /enter/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
