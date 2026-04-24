import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PreGameMenu from '../pages/PreGameMenu';
import * as gameyApi from '../GameyApi';

vi.mock('../GameyApi', async () => {
    const actual = await vi.importActual<typeof import('../GameyApi')>('../GameyApi');
    return {
        ...actual,
        fetchAvailableBots: vi.fn(),
    };
});

const mockedFetchAvailableBots = vi.mocked(gameyApi.fetchAvailableBots);
type FetchAvailableBotsResult = Awaited<ReturnType<typeof gameyApi.fetchAvailableBots>>;

describe('PreGameMenu', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('en modo local no intenta cargar bots y permite empezar con la variante elegida', async () => {
        const user = userEvent.setup();
        const onBack = vi.fn();
        const onStart = vi.fn();

        render(
            <PreGameMenu
                username="Ana"
                mode="local"
                boardSize={7}
                initialVariant="standard"
                initialBotId="side_bot"
                initialBlueAvatarId="elf"
                initialRedAvatarId="wizard"
                onBack={onBack}
                onStart={onStart}
            />,
        );

        expect(screen.getByText(/PRE-PARTIDA/i)).toBeInTheDocument();
        expect(screen.getByText(/Local 2 jugadores/i)).toBeInTheDocument();
        expect(mockedFetchAvailableBots).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: /Why Not/i }));
        await user.click(screen.getByRole('button', { name: /Empezar partida/i }));

        expect(onStart).toHaveBeenCalledWith({
            variant: 'why_not',
            botId: 'side_bot',
            blueAvatarId: 'elf',
            redAvatarId: 'wizard',
        });
    });

    it('en modo bot carga bots del servidor, muestra basicos y estrategias, y arranca con lo seleccionado', async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();

        mockedFetchAvailableBots.mockResolvedValueOnce([
            { id: 'random_bot', title: 'Aleatorio', description: 'x', tags: ['basic'] },
            { id: 'side_bot', title: 'Facil', description: 'x', tags: ['basic'] },
            { id: 'bridge_bot', title: 'Bot puente', description: 'x', tags: ['strategy'] },
        ]);

        render(
            <PreGameMenu
                username="Ana"
                mode="bot"
                boardSize={5}
                initialVariant="standard"
                initialBotId="side_bot"
                initialBlueAvatarId="elf"
                initialRedAvatarId="wizard"
                onBack={vi.fn()}
                onStart={onStart}
            />,
        );

        await waitFor(() => expect(mockedFetchAvailableBots).toHaveBeenCalledTimes(1));

        expect(screen.getByText(/BASICOS/i)).toBeInTheDocument();
        expect(screen.getByText(/ESTRATEGIAS/i)).toBeInTheDocument();
        expect(screen.getByText('Facil')).toBeInTheDocument();
        expect(screen.getByText('Aleatorio')).toBeInTheDocument();
        expect(screen.getByText('Bot puente')).toBeInTheDocument();

        await user.click(screen.getByText('Aleatorio'));
        await user.click(screen.getByRole('button', { name: /Why Not/i }));
        await user.click(screen.getByRole('button', { name: /Empezar partida/i }));

        expect(onStart).toHaveBeenCalledWith({
            variant: 'why_not',
            botId: 'random_bot',
            blueAvatarId: 'elf',
            redAvatarId: 'wizard',
        });
    });

    it('si falla la carga de bots, muestra aviso y usa opciones por defecto', async () => {
        const user = userEvent.setup();
        const onStart = vi.fn();

        mockedFetchAvailableBots.mockRejectedValueOnce(new Error('Network'));

        render(
            <PreGameMenu
                username="Ana"
                mode="bot"
                boardSize={5}
                initialVariant="standard"
                initialBotId="side_bot"
                initialBlueAvatarId="elf"
                initialRedAvatarId="wizard"
                onBack={vi.fn()}
                onStart={onStart}
            />,
        );

        expect(
            await screen.findByText(/Usando opciones por defecto/i),
        ).toBeInTheDocument();

        // FALLBACK_BOTS includes these by design
        expect(screen.getByText('Facil')).toBeInTheDocument();
        expect(screen.getByText('Dificil')).toBeInTheDocument();
        expect(screen.getByText('Aleatorio')).toBeInTheDocument();

        await user.click(screen.getByText('Dificil'));
        await user.click(screen.getByRole('button', { name: /Empezar partida/i }));

        expect(onStart).toHaveBeenCalledWith({
            variant: 'standard',
            botId: 'side_bot_hard',
            blueAvatarId: 'elf',
            redAvatarId: 'wizard',
        });
    });

    it('muestra un estado de carga mientras se estan pidiendo los bots', async () => {
        let resolveFn!: (value: FetchAvailableBotsResult) => void;
        mockedFetchAvailableBots.mockImplementationOnce(
            () => new Promise<FetchAvailableBotsResult>((resolve) => { resolveFn = resolve; }),
        );

        render(
            <PreGameMenu
                username="Ana"
                mode="bot"
                boardSize={5}
                initialVariant="standard"
                initialBotId="side_bot"
                initialBlueAvatarId="elf"
                initialRedAvatarId="wizard"
                onBack={vi.fn()}
                onStart={vi.fn()}
            />,
        );

        expect(await screen.findByText(/Cargando bots disponibles/i)).toBeInTheDocument();

        resolveFn([
            { id: 'side_bot', title: 'Facil', description: 'x', tags: ['basic'] },
        ]);

        await waitFor(() => expect(screen.queryByText(/Cargando bots disponibles/i)).not.toBeInTheDocument());
        expect(screen.getByText('Facil')).toBeInTheDocument();
    });

    it('llama a onBack al pulsar Volver', async () => {
        const user = userEvent.setup();
        const onBack = vi.fn();

        render(
            <PreGameMenu
                username="Ana"
                mode="local"
                boardSize={7}
                initialVariant="standard"
                initialBotId="side_bot"
                initialBlueAvatarId="elf"
                initialRedAvatarId="wizard"
                onBack={onBack}
                onStart={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Volver/i }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
