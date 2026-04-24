import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Perfil from '../pages/Perfil';

describe('Perfil', () => {
    it('muestra el avatar seleccionado y los datos del usuario', () => {
        render(
            <Perfil
                username="Ana"
                avatarId="wizard"
                onSelectAvatar={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        expect(screen.getByText('Elige Tu Avatar')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 5, name: 'Mago' })).toBeInTheDocument();
        expect(screen.getByText('@Ana')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /seleccionar avatar mago/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('permite cambiar de avatar y llama al callback', async () => {
        const user = userEvent.setup();
        const onSelectAvatar = vi.fn();

        render(
            <Perfil
                username="Ana"
                avatarId="elf"
                onSelectAvatar={onSelectAvatar}
                onBack={vi.fn()}
            />,
        );

        const wizardButton = screen.getByRole('button', { name: /seleccionar avatar mago/i });
        await user.click(wizardButton);

        expect(onSelectAvatar).toHaveBeenCalledWith('wizard');
        expect(wizardButton).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('heading', { level: 5, name: 'Mago' })).toBeInTheDocument();
    });

    it('sincroniza el avatar visible si la prop cambia desde fuera', () => {
        const { rerender } = render(
            <Perfil
                username="Ana"
                avatarId="elf"
                onSelectAvatar={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: /seleccionar avatar elfo/i })).toHaveAttribute('aria-pressed', 'true');

        rerender(
            <Perfil
                username="Ana"
                avatarId="ninja"
                onSelectAvatar={vi.fn()}
                onBack={vi.fn()}
            />,
        );

        expect(screen.getByRole('button', { name: /seleccionar avatar ninja/i })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('heading', { level: 5, name: 'Ninja' })).toBeInTheDocument();
    });

    it('llama a onBack al pulsar volver', async () => {
        const user = userEvent.setup();
        const onBack = vi.fn();

        render(
            <Perfil
                username="Ana"
                avatarId="elf"
                onSelectAvatar={vi.fn()}
                onBack={onBack}
            />,
        );

        await user.click(screen.getByRole('button', { name: /volver/i }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
