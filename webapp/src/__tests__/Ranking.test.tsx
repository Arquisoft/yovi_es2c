import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Ranking from '../pages/Ranking';
import * as UsersApi from '../UsersApi';

vi.mock('../UsersApi', async () => {
    const actual = await vi.importActual<typeof import('../UsersApi')>('../UsersApi');
    return {
        ...actual,
        fetchRanking: vi.fn(),
    };
});

const mockedFetchRanking = vi.mocked(UsersApi.fetchRanking);

describe('Ranking', () => {
    const onBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el header correctamente', async () => {
        mockedFetchRanking.mockResolvedValue([]);

        render(<Ranking username="Ana" onBack={onBack} />);

        expect(screen.getByText(/Ranking/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Volver/i })).toBeInTheDocument();
    });

    it('llama a onBack al pulsar Volver', async () => {
        const user = userEvent.setup();
        mockedFetchRanking.mockResolvedValue([]);

        render(<Ranking username="Ana" onBack={onBack} />);

        await user.click(screen.getByRole('button', { name: /Volver/i }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('muestra mensaje de vacío cuando no hay jugadores', async () => {
        mockedFetchRanking.mockResolvedValue([]);

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            expect(screen.getByText(/Todavía no hay jugadores en el ranking/i)).toBeInTheDocument();
        });
    });

    it('marca al usuario actual con el chip "Tú"', async () => {
        mockedFetchRanking.mockResolvedValue([
            { position: 1, username: 'Ana', wins: 0, losses: 0, winRate: 0 },
        ]);

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            // Ana aparece tanto en el header como en la lista
            const anas = screen.getAllByText('Ana');
            expect(anas.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText('Tú')).toBeInTheDocument();
        });
    });

    it('muestra error si fetchRanking falla', async () => {
        mockedFetchRanking.mockRejectedValue(new Error('Could not fetch ranking'));

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            expect(screen.getByText(/Could not fetch ranking/i)).toBeInTheDocument();
        });
    });

    it('muestra el spinner mientras carga', () => {
        mockedFetchRanking.mockReturnValue(new Promise(() => {}));

        render(<Ranking username="Ana" onBack={onBack} />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
});