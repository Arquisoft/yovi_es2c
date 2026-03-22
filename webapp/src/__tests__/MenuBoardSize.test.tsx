import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { act } from 'react';
import Menu from '../pages/Menu';

describe('Menu board size selection', () => {
  it('updates the board size hint when selecting a different size', async () => {
    const user = userEvent.setup();

    render(
      <Menu
        onLogout={() => {}}
        onJugar={() => {}}
        initialUsername="Ana"
        onVerHistorial={() => {}}
      />,
    );

    expect(screen.getByText(/Lados del tri.*: 7/i)).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '5' }));
    });

    expect(await screen.findByText(/Lados del tri.*: 5/i)).toBeInTheDocument();
  });

  it('toggles the active size button between 5, 7, and 9', async () => {
    const user = userEvent.setup();

    render(
      <Menu
        onLogout={() => {}}
        onJugar={() => {}}
        initialUsername="Ana"
        onVerHistorial={() => {}}
      />,
    );

    const size5 = screen.getByRole('button', { name: '5' });
    const size7 = screen.getByRole('button', { name: '7' });
    const size9 = screen.getByRole('button', { name: '9' });

    expect(size7).toHaveAttribute('aria-pressed', 'true');

    await user.click(size5);
    await screen.findByText(/Lados del tri.*: 5/i);
    expect(size5).toHaveAttribute('aria-pressed', 'true');
    expect(size7).toHaveAttribute('aria-pressed', 'false');
    expect(size9).toHaveAttribute('aria-pressed', 'false');

    await user.click(size9);
    await screen.findByText(/Lados del tri.*: 9/i);
    expect(size9).toHaveAttribute('aria-pressed', 'true');
    expect(size5).toHaveAttribute('aria-pressed', 'false');
    expect(size7).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps the selected size when switching between local and bot modes', async () => {
    const user = userEvent.setup();
    const onJugar = vi.fn();

    render(
      <Menu
        onLogout={() => {}}
        onJugar={onJugar}
        initialUsername="Ana"
        onVerHistorial={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: '9' }));
    await screen.findByText(/Lados del tri.*: 9/i);

    await user.click(screen.getByRole('button', { name: /vs ia bot/i }));
    await waitFor(() => {
      expect(onJugar).toHaveBeenCalledWith('Ana', 'bot', 9);
    });

    onJugar.mockClear();

    await user.click(screen.getByRole('button', { name: /partida local/i }));
    await waitFor(() => {
      expect(onJugar).toHaveBeenCalledWith('Ana', 'local', 9);
    });
  });

  it('uses the selected board size when starting a local game', async () => {
    const user = userEvent.setup();
    const onJugar = vi.fn();

    render(
      <Menu
        onLogout={() => {}}
        onJugar={onJugar}
        initialUsername="Ana"
        onVerHistorial={() => {}}
      />,
    );

    const sizeNineButton = screen.getByRole('button', { name: '9' });
    await act(async () => {
      await user.click(sizeNineButton);
    });

    expect(sizeNineButton).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /partida local/i }));
    });

    await waitFor(() => {
      expect(onJugar).toHaveBeenCalledWith('Ana', 'local', 9);
    });
  });

  it('uses the selected board size when starting a bot game', async () => {
    const user = userEvent.setup();
    const onJugar = vi.fn();

    render(
      <Menu
        onLogout={() => {}}
        onJugar={onJugar}
        initialUsername="Ana"
        onVerHistorial={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: '5' }));
    await screen.findByText(/Lados del tri.*: 5/i);
    await user.click(screen.getByRole('button', { name: /vs ia bot/i }));

    await waitFor(() => {
      expect(onJugar).toHaveBeenCalledWith('Ana', 'bot', 5);
    });
  });
});
