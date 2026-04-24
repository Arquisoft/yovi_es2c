import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock de Inicio
vi.mock('../pages/Inicio', () => ({
  default: ({ onEntrar }: { onEntrar: (name: string) => void }) => (
      <div>
        <h1>Inicio mock</h1>
        <button onClick={() => onEntrar('Ana')}>Entrar como Ana</button>
        <button onClick={() => onEntrar('')}>Entrar vacío</button>
      </div>
  ),
}));

// Mock de Menu
vi.mock('../pages/Menu', () => ({
  default: ({
              onLogout,
              initialUsername,
              onJugar,
              onVerHistorial,
              onVerRanking,
              onVerEstadisticas,
            }: {
    onLogout: () => void;
    initialUsername: string;
    onJugar: (name: string, mode: 'local' | 'bot', size: number) => void;
    onVerHistorial: () => void;
    onVerRanking: () => void;
    onVerEstadisticas: () => void;
  }) => (
      <div>
        <h1>Menu mock</h1>
        <p>Usuario inicial: {initialUsername}</p>
        <button onClick={onLogout}>Logout</button>
        <button onClick={() => onJugar('Lucia', 'bot', 9)}>Jugar bot 9</button>
        <button onClick={() => onJugar('', 'local', 5)}>Jugar por defecto</button>
        <button onClick={onVerHistorial}>Ir a historial</button>
        <button onClick={onVerRanking}>Ir a ranking</button>
        <button onClick={onVerEstadisticas}>Ir a estadisticas</button>
      </div>
  ),
}));

// Mock de Historial
vi.mock('../pages/Historial', () => ({
  default: ({
              username,
              onBack,
            }: {
    username: string;
    onBack: () => void;
  }) => (
      <div>
        <h1>Historial mock</h1>
        <p>Usuario historial: {username}</p>
        <button onClick={onBack}>Volver</button>
      </div>
  ),
}));

vi.mock('../pages/PreGameMenu', () => ({
  default: ({
              mode,
              boardSize,
              onBack,
              onStart,
            }: {
    mode: 'local' | 'bot';
    boardSize: number;
    onBack: () => void;
    onStart: (opts: { variant: 'standard' | 'why_not'; botId: string }) => void;
  }) => (
      <div>
        <h1>PreGameMenu mock</h1>
        <p>Modo pregame: {mode}</p>
        <p>Tam pregame: {boardSize}</p>
        <button onClick={onBack}>Volver al menu</button>
        <button onClick={() => onStart({ variant: 'why_not', botId: 'random_bot' })}>Empezar</button>
      </div>
  ),
}));

// Espía para comprobar props de GameBoard
const gameBoardMock = vi.fn();

vi.mock('../GameBoard', () => ({
  default: (props: {
    username: string;
    mode: 'local' | 'bot';
    boardSize: number;
    variant?: 'standard' | 'why_not';
    botId?: string;
    onExit: (didResign: boolean) => void;
  }) => {
    gameBoardMock(props);
    return (
        <div>
          <h1>GameBoard mock</h1>
          <p>Usuario: {props.username}</p>
          <p>Modo: {props.mode}</p>
          <p>Tamaño: {props.boardSize}</p>
          <button onClick={() => props.onExit(true)}>Salir partida</button>
          <button onClick={() => props.onExit(false)}>Salir partida finalizada</button>
        </div>
    );
  },
}));

// Mock de Ranking
vi.mock('../pages/Ranking', () => ({
  default: ({
              username,
              onBack,
              initialTab,
            }: {
    username: string;
    onBack: () => void;
    initialTab: number;
  }) => (
      <div>
        <h1>Ranking mock</h1>
        <p>Usuario ranking: {username}</p>
        <p>Tab inicial: {initialTab}</p>
        <button onClick={onBack}>Volver</button>
      </div>
  ),
}));

// Mock simple de FadeView
vi.mock('../FadeView', () => ({
  default: ({
              children,
              viewKey,
            }: {
    children: React.ReactNode;
    viewKey: string;
  }) => (
      <div data-testid="fade-view" data-viewkey={viewKey}>
        {children}
      </div>
  ),
}));

describe('App', () => {
  beforeEach(() => {
    gameBoardMock.mockClear();
  });

  it('muestra la vista de inicio al renderizar', () => {
    render(<App />);

    expect(screen.getByText('Inicio mock')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'inicio');
  });

  it('entra desde inicio y navega al menú con el nombre recibido', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));

    expect(screen.getByText('Menu mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario inicial: Ana')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'menu');
  });

  it('usa "Jugador" como nombre por defecto si se entra con nombre vacío', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar vacío'));

    expect(screen.getByText('Menu mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario inicial: Jugador')).toBeInTheDocument();
  });

  it('desde el menú inicia una partida y pasa las props correctas a GameBoard', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Jugar bot 9'));

    expect(screen.getByText('PreGameMenu mock')).toBeInTheDocument();
    expect(screen.getByText('Modo pregame: bot')).toBeInTheDocument();
    expect(screen.getByText('Tam pregame: 9')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'pregame');

    fireEvent.click(screen.getByText('Empezar'));

    expect(screen.getByText('GameBoard mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario: Lucia')).toBeInTheDocument();
    expect(screen.getByText('Modo: bot')).toBeInTheDocument();
    expect(screen.getByText('Tamaño: 9')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'game');

    expect(gameBoardMock).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'Lucia',
          mode: 'bot',
          boardSize: 9,
          variant: 'why_not',
          botId: 'random_bot',
          onExit: expect.any(Function),
        }),
    );
  });

  it('al jugar con nombre vacío usa "Jugador" por defecto', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Jugar por defecto'));

    expect(screen.getByText('PreGameMenu mock')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Empezar'));

    expect(screen.getByText('GameBoard mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario: Jugador')).toBeInTheDocument();
    expect(screen.getByText('Modo: local')).toBeInTheDocument();
    expect(screen.getByText('Tamaño: 5')).toBeInTheDocument();
  });

  it('desde el menú navega al historial', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Ir a historial'));

    expect(screen.getByText('Historial mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario historial: Ana')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'historial');
  });

  it('desde historial vuelve al menú', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Ir a historial'));
    fireEvent.click(screen.getByText('Volver'));

    expect(screen.getByText('Menu mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario inicial: Ana')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'menu');
  });

  it('logout reinicia el usuario y vuelve a inicio', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Logout'));

    expect(screen.getByText('Inicio mock')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'inicio');
  });

  it('desde GameBoard al salir vuelve al menú', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Jugar bot 9'));
    fireEvent.click(screen.getByText('Empezar'));
    fireEvent.click(screen.getByText('Salir partida'));

    expect(screen.getByText('Menu mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario inicial: Lucia')).toBeInTheDocument();
    expect(screen.getByText('Has abandonado la partida. Se ha registrado como rendición.')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'menu');
  });

  it('si la partida ya ha terminado, salir no muestra rendición', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Jugar bot 9'));
    fireEvent.click(screen.getByText('Empezar'));
    fireEvent.click(screen.getByText('Salir partida finalizada'));

    expect(screen.getByText('Menu mock')).toBeInTheDocument();
    expect(screen.getByText('Usuario inicial: Lucia')).toBeInTheDocument();
    expect(screen.getByText('Partida finalizada. Volviendo al menú.')).toBeInTheDocument();
  });

  it('desde el menú navega al ranking global', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Ir a ranking'));

    expect(screen.getByText('Ranking mock')).toBeInTheDocument();
    expect(screen.getByText('Tab inicial: 0')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'ranking');
  });

  it('desde el menú navega a mis estadísticas', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Entrar como Ana'));
    fireEvent.click(screen.getByText('Ir a estadisticas'));

    expect(screen.getByText('Ranking mock')).toBeInTheDocument();
    expect(screen.getByText('Tab inicial: 1')).toBeInTheDocument();
    expect(screen.getByTestId('fade-view')).toHaveAttribute('data-viewkey', 'ranking');
  });
});
