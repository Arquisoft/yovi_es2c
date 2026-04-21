import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Historial from '../pages/Historial';
import { fetchGameHistory } from '../GameyApi';

vi.mock('../GameyApi', () => ({
    fetchGameHistory: vi.fn(),
}));

describe('Historial', () => {
    const mockOnBack = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el titulo y el username', async () => {
        vi.mocked(fetchGameHistory).mockResolvedValue([]);

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(screen.getByText('Historial de partidas')).toBeInTheDocument();
        expect(screen.getByText('Manuel')).toBeInTheDocument();

        await waitFor(() => {
            expect(fetchGameHistory).toHaveBeenCalledTimes(1);
            expect(fetchGameHistory).toHaveBeenCalledWith('Manuel');
        });
    });

    it('muestra el loading al inicio', () => {
        vi.mocked(fetchGameHistory).mockReturnValue(new Promise(() => {}));

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('muestra el estado vacio cuando no hay partidas', async () => {
        vi.mocked(fetchGameHistory).mockResolvedValue([]);

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(await screen.findByText('Todavía no hay partidas registradas.')).toBeInTheDocument();
        expect(
            screen.getByText('Juega tu primera partida para verla aquí.')
        ).toBeInTheDocument();
    });

    it('muestra error si fetchGameHistory falla', async () => {
        vi.mocked(fetchGameHistory).mockRejectedValue(new Error('Error al cargar historial'));

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(await screen.findByText('Error al cargar historial')).toBeInTheDocument();
    });

    it('muestra la lista de partidas cuando hay datos', async () => {
        vi.mocked(fetchGameHistory).mockResolvedValue([
            {
                timestamp: 1710000000,
                winner: '0',
                board_size: 5,
                duration_seconds: 42,
                moves_count: 10,
            },
            {
                timestamp: 1710000100,
                winner: '1',
                board_size: 7,
                duration_seconds: 60,
                moves_count: 14,
            },
        ]);

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(await screen.findByText(/Ganador: Azul/i)).toBeInTheDocument();
        expect(screen.getByText(/Ganador: Rojo/i)).toBeInTheDocument();
        expect(screen.getByText(/Tamaño: 5/i)).toBeInTheDocument();
        expect(screen.getByText(/Tamaño: 7/i)).toBeInTheDocument();
        expect(screen.getByText(/Duración: 42s/i)).toBeInTheDocument();
        expect(screen.getByText(/Duración: 60s/i)).toBeInTheDocument();
    });

    it('muestra N/A cuando winner es null', async () => {
        vi.mocked(fetchGameHistory).mockResolvedValue([
            {
                timestamp: 1710000000,
                winner: null,
                board_size: 5,
                duration_seconds: 30,
                moves_count: 8,
            },
        ]);

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        expect(await screen.findByText(/Ganador: N\/A/i)).toBeInTheDocument();
    });

    it('llama a onBack al pulsar el boton volver', async () => {
        vi.mocked(fetchGameHistory).mockResolvedValue([]);

        render(<Historial username="Manuel" onBack={mockOnBack} />);

        const botonVolver = await screen.findByRole('button', { name: /volver/i });
        fireEvent.click(botonVolver);

        expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
});
