import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FadeView from '../FadeView';

describe('FadeView', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('renderiza el contenido inicial', () => {
        render(
            <FadeView viewKey="inicio">
                <div>Vista inicial</div>
            </FadeView>
        );

        expect(screen.getByText('Vista inicial')).toBeInTheDocument();
    });

    it('mantiene el contenido inicial durante la primera transición a visible', () => {
        render(
            <FadeView viewKey="inicio">
                <div>Vista inicial</div>
            </FadeView>
        );

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(screen.getByText('Vista inicial')).toBeInTheDocument();
    });

    it('cuando cambia viewKey mantiene primero el contenido anterior', () => {
        const { rerender } = render(
            <FadeView viewKey="inicio">
                <div>Contenido A</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="menu">
                <div>Contenido B</div>
            </FadeView>
        );

        expect(screen.getByText('Contenido A')).toBeInTheDocument();
        expect(screen.queryByText('Contenido B')).not.toBeInTheDocument();
    });

    it('intercambia al nuevo contenido después de 350ms', () => {
        const { rerender } = render(
            <FadeView viewKey="inicio">
                <div>Contenido A</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="menu">
                <div>Contenido B</div>
            </FadeView>
        );

        act(() => {
            vi.advanceTimersByTime(350);
        });

        expect(screen.queryByText('Contenido A')).not.toBeInTheDocument();
        expect(screen.getByText('Contenido B')).toBeInTheDocument();
    });

    it('sigue mostrando el nuevo contenido cuando termina la entrada', () => {
        const { rerender } = render(
            <FadeView viewKey="inicio">
                <div>Contenido A</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="game">
                <div>Contenido B</div>
            </FadeView>
        );

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(screen.queryByText('Contenido A')).not.toBeInTheDocument();
        expect(screen.getByText('Contenido B')).toBeInTheDocument();
    });

    it('soporta cambios rápidos de viewKey sin romperse', () => {
        const { rerender } = render(
            <FadeView viewKey="inicio">
                <div>Inicio</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="menu">
                <div>Menu</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="game">
                <div>Game</div>
            </FadeView>
        );

        act(() => {
            vi.runAllTimers();
        });

        expect(screen.getByText('Game')).toBeInTheDocument();
    });

    it('no falla al desmontarse con timers pendientes', () => {
        const { unmount, rerender } = render(
            <FadeView viewKey="inicio">
                <div>Inicio</div>
            </FadeView>
        );

        rerender(
            <FadeView viewKey="menu">
                <div>Menu</div>
            </FadeView>
        );

        expect(() => {
            unmount();
            act(() => {
                vi.runAllTimers();
            });
        }).not.toThrow();
    });
});