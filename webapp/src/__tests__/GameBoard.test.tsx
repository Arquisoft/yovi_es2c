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

vi.mock('../UsersApi', () => ({
    recordGameResult: vi.fn(),
}));

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
        mockedApplyMove.mockReset();
        mockedChooseBotMove.mockReset();
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
        expect(screen.getByRole('button', { name: /Silenciar musica|Activar sonido/i })).toBeInTheDocument();
    });

    it('inicia la musica al entrar en partida y la deja en loop', () => {
        const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play');
        const { container } = render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const audio = container.querySelector('audio');

        expect(audio).not.toBeNull();
        expect(audio).toHaveAttribute('src', '/pink-panther.mp3');
        expect(audio?.loop).toBe(true);
        expect(playSpy).toHaveBeenCalled();
    });

    it('permite silenciar y volver a activar el sonido', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={() => {}}
            />
        );

        const audio = container.querySelector('audio') as HTMLAudioElement;
        const toggleMuteButton = screen.getByRole('button', { name: /Silenciar musica/i });

        expect(audio.muted).toBe(false);

        await user.click(toggleMuteButton);
        expect(audio.muted).toBe(true);

        await user.click(screen.getByRole('button', { name: /Activar sonido/i }));
        expect(audio.muted).toBe(false);
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
        expect(onExit).toHaveBeenCalledWith(true);
    });

    it('muestra el mensaje de victoria ampliado cuando gana un jugador', async () => {
        const user = userEvent.setup();

        mockedApplyMove.mockResolvedValue({
            yen: {
                ...initialYen,
                turn: 1,
                layout: 'B/BB/.../..../.....',
            },
            status: 'finished',
            winner: 0,
            next_player: null,
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

        expect(await screen.findByText(/🏆 ENHORABUENA, GANA AZUL! 🏆/i)).toBeInTheDocument();
    });

    it('al salir tras finalizar la partida no marca rendición', async () => {
        const user = userEvent.setup();
        const onExit = vi.fn();

        mockedApplyMove.mockResolvedValue({
            yen: {
                ...initialYen,
                turn: 1,
                layout: 'B/BB/.../..../.....',
            },
            status: 'finished',
            winner: 0,
            next_player: null,
        });

        render(
            <GameBoard
                username="Ana"
                mode="local"
                boardSize={5}
                onExit={onExit}
            />
        );

        const cells = screen.getAllByTitle(/^\(/i);
        await user.click(cells[0]);
        await screen.findByText(/🏆 ENHORABUENA, GANA AZUL! 🏆/i);

        await user.click(screen.getByRole('button', { name: /Salir/i }));

        expect(onExit).toHaveBeenCalledWith(false);
    });

    it('llama a applyMove al pulsar una celda vacia', async () => {
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

        mockedApplyMove.mockRejectedValue(new Error('Movimiento no valido'));

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
            await screen.findByText(/Movimiento invalido: Movimiento no valido/i)
        ).toBeInTheDocument();
    });

    it('en modo bot llama a chooseBotMove despues del movimiento humano', async () => {
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
