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
        fetchPersonalStats: vi.fn(),
        fetchRanking: vi.fn(),
    };
});

const mockedFetchPersonalStats = vi.mocked(UsersApi.fetchPersonalStats);
const mockedFetchRanking = vi.mocked(UsersApi.fetchRanking);

describe('Ranking', () => {
    const onBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockedFetchRanking.mockResolvedValue([]);
    });

    it('renderiza el header del ranking global por defecto', async () => {
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            rankingPosition: null,
        });

        render(<Ranking username="Ana" onBack={onBack} />);

        expect(screen.getByText(/Ranking Global/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Volver/i })).toBeInTheDocument();
    });

    it('permite cambiar a la pestaña de estadísticas personales', async () => {
        const user = userEvent.setup();
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 5,
            losses: 2,
            totalGames: 7,
            winRate: 71,
            rankingPosition: 1,
        });

        render(<Ranking username="Ana" onBack={onBack} />);

        const statsTab = screen.getByRole('tab', { name: /Mis Estadísticas/i });
        await user.click(statsTab);

        expect(screen.getByText(/Estadísticas personales/i)).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renderiza la pestaña de estadísticas directamente si se indica en props', async () => {
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 5,
            losses: 2,
            totalGames: 7,
            winRate: 71,
            rankingPosition: 1,
        });

        render(<Ranking username="Ana" onBack={onBack} initialTab={1} />);

        expect(screen.getByText(/Estadísticas personales/i)).toBeInTheDocument();
    });

    it('llama a onBack al pulsar Volver', async () => {
        const user = userEvent.setup();
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            rankingPosition: null,
        });

        render(<Ranking username="Ana" onBack={onBack} />);

        await user.click(screen.getByRole('button', { name: /Volver/i }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('muestra las estadísticas del usuario autenticado', async () => {
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 7,
            losses: 3,
            totalGames: 10,
            winRate: 70,
            rankingPosition: 2,
        });

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('7')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('70%')).toBeInTheDocument();
            expect(screen.getByText(/Puesto actual en el ranking global: #2/i)).toBeInTheDocument();
        });
    });

    it('muestra mensaje cuando el usuario aún no aparece en ranking', async () => {
        mockedFetchPersonalStats.mockResolvedValue({
            username: 'Ana',
            wins: 0,
            losses: 0,
            totalGames: 0,
            winRate: 0,
            rankingPosition: null,
        });

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            expect(screen.getByText(/Todavía no apareces en el ranking global/i)).toBeInTheDocument();
        });
    });

    it('muestra error si fetchPersonalStats falla', async () => {
        mockedFetchPersonalStats.mockRejectedValue(new Error('Could not fetch ranking'));

        render(<Ranking username="Ana" onBack={onBack} />);

        await waitFor(() => {
            expect(screen.getByText(/Could not fetch ranking/i)).toBeInTheDocument();
        });
    });

    it('muestra el spinner mientras carga', () => {
        mockedFetchPersonalStats.mockReturnValue(new Promise(() => {}));

        render(<Ranking username="Ana" onBack={onBack} />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
});
