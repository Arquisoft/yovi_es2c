import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Inicio from '../pages/Inicio';

vi.mock('../RegisterForm', () => ({
    default: ({ onAuthSuccess }: { onAuthSuccess: (username: string) => void }) => (
        <button onClick={() => onAuthSuccess('Manuel')}>Mock RegisterForm</button>
    ),
}));

describe('Inicio', () => {
    it('renderiza el badge season live', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(screen.getByText(/SEASON LIVE/i)).toBeInTheDocument();
    });

    it('renderiza el titulo principal', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(screen.getByText('YOVI ARENA')).toBeInTheDocument();
    });

    it('renderiza la descripcion', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(
            screen.getByText(/Tablero triangular, bolas rojas y azules, y pura precisión en cada jugada\./i)
        ).toBeInTheDocument();
    });

    it('renderiza la imagen del tablero', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(screen.getByAltText('Tablero triangular')).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /tablero triangular/i })).toHaveAttribute(
            'src',
            '/tri-billiard.svg'
        );
    });

    it('renderiza los chips informativos', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(screen.getByText(/12.8K jugadores/i)).toBeInTheDocument();
        expect(screen.getByText(/Servidor online/i)).toBeInTheDocument();
        expect(screen.getByText(/Modo competitivo/i)).toBeInTheDocument();
    });

    it('renderiza RegisterForm', () => {
        render(<Inicio onEntrar={vi.fn()} />);

        expect(screen.getByText('Mock RegisterForm')).toBeInTheDocument();
    });

    it('llama a onEntrar cuando RegisterForm notifica exito', () => {
        const mockOnEntrar = vi.fn();

        render(<Inicio onEntrar={mockOnEntrar} />);

        fireEvent.click(screen.getByText('Mock RegisterForm'));

        expect(mockOnEntrar).toHaveBeenCalledTimes(1);
        expect(mockOnEntrar).toHaveBeenCalledWith('Manuel');
    });
});