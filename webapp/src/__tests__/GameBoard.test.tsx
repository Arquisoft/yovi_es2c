import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameBoard from '../GameBoard';
import type { YEN } from '../GameyApi';
import * as gameyApi from '../GameyApi';

vi.mock('../GameyApi', async () => {
    const actual = await vi.importActual<typeof import('../GameyApi')>('../GameyApi');
    return {
        ...actual,
        applyMove: vi.fn(),
        chooseBotMove: vi.fn(),
    };
});

const mockedApplyMove = vi.mocked(gameyApi.applyMove);
const mockedChooseBotMove = vi.mocked(gameyApi.chooseBotMove);

const initialYen: YEN = {
    size: 5,
    turn: 0,
    players: ['B', 'R'],
    layout: './../.../..../.....',
    variant: 'standard',
};

describe('GameBoard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza el estado inicial en modo local', () => {
        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        expect(screen.getByText(/YOVI ARENA/i)).toBeInTheDocument();
        expect(screen.getByText(/Ana/i)).toBeInTheDocument();
        expect(screen.getByText(/TURNO DE AZUL/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Nueva/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Salir/i })).toBeInTheDocument();
    });

    it('llama a onExit al pulsar salir', async () => {
        const user = userEvent.setup();
        const onExit = vi.fn();

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={onExit}
            />
        );

        await user.click(screen.getByRole('button', { name: /Salir/i }));

        expect(onExit).toHaveBeenCalledTimes(1);
    });

    it('llama a applyMove al pulsar una celda vacía', async () => {
        const user = userEvent.setup();

        mockedApplyMove.mockResolvedValue({
            yen: {
                ...initialYen,
                turn: 1,
                layout: 'B/../.../..../.....',
            },
            status: 'ongoing',
            winner: null,
            next_player: 1,
        });

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const cells = screen.getAllByTitle(/^\(/i);
        await user.click(cells[0]);

        await waitFor(() => {
            expect(mockedApplyMove).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByText(/TURNO DE ROJO/i)).toBeInTheDocument();
    });

    it('muestra un error si applyMove falla', async () => {
        const user = userEvent.setup();

        mockedApplyMove.mockRejectedValue(new Error('Movimiento no válido'));

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const cells = screen.getAllByTitle(/^\(/i);
        await user.click(cells[0]);

        expect(
            await screen.findByText(/Movimiento inválido: Movimiento no válido/i)
        ).toBeInTheDocument();
    });

    it('muestra los botones de bots al cambiar a modo bot', async () => {
        const user = userEvent.setup();

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        await user.click(screen.getByRole('button', { name: /Vs Bot/i }));

        expect(screen.getByRole('button', { name: /Bot fácil/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Bot difícil/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Aleatorio global/i })).toBeInTheDocument();
    });

    it('cambia la variante visible al pulsar Why Not', async () => {
        const user = userEvent.setup();

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        expect(screen.getByText(/Ana\s*·\s*Estándar/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Why Not/i }));

        expect(screen.getByText(/Ana\s*·\s*Why Not/i)).toBeInTheDocument();
    });

    it('en modo bot llama a chooseBotMove después del movimiento humano', async () => {
        const user = userEvent.setup();

        mockedApplyMove
            .mockResolvedValueOnce({
                yen: {
                    ...initialYen,
                    turn: 1,
                    layout: 'B/../.../..../.....',
                },
                status: 'ongoing',
                winner: null,
                next_player: 1,
            })
            .mockResolvedValueOnce({
                yen: {
                    ...initialYen,
                    turn: 0,
                    layout: 'B/R./.../..../.....',
                },
                status: 'ongoing',
                winner: null,
                next_player: 0,
            });

        mockedChooseBotMove.mockResolvedValue({ x: 3, y: 0, z: 1 });

        render(
            <GameBoard
                username="Ana"
                mode="bot"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const cells = screen.getAllByTitle(/^\(/i);
        await user.click(cells[0]);

        await waitFor(() => {
            expect(mockedChooseBotMove).toHaveBeenCalledTimes(1);
        });

        expect(mockedApplyMove).toHaveBeenCalledTimes(2);
    });

    it('resetea la partida al pulsar Nueva', async () => {
        const user = userEvent.setup();

        mockedApplyMove.mockResolvedValue({
            yen: {
                ...initialYen,
                turn: 1,
                layout: 'B/../.../..../.....',
            },
            status: 'ongoing',
            winner: null,
            next_player: 1,
        });

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const cells = screen.getAllByTitle(/^\(/i);
        await user.click(cells[0]);

        await waitFor(() => {
            expect(mockedApplyMove).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByText(/TURNO DE ROJO/i)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Nueva/i }));

        expect(screen.getByText(/TURNO DE AZUL/i)).toBeInTheDocument();
    });
});