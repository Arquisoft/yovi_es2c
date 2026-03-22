import { useState } from 'react';
import './App.css';
import './styles/Additions.css';
import Inicio from './pages/Inicio';
import Menu from './pages/Menu';
import Historial from './pages/Historial';
import GameBoard, { type GameMode } from './GameBoard';
import FadeView from './FadeView';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type View = 'inicio' | 'menu' | 'game' | 'historial';

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * App es el componente raíz de la aplicación.
 * Gestiona la navegación entre vistas y el estado global compartido
 * (nombre de usuario, modo de juego y tamaño del tablero).
 */
export default function App() {

  // Vista activa actualmente
  const [view, setView] = useState<View>('inicio');

  // Nombre del jugador autenticado
  const [username, setUsername] = useState('Jugador');

  // Modo de juego seleccionado: 'local' (2 jugadores) o 'bot' (vs IA)
  const [gameMode, setGameMode] = useState<GameMode>('local');

  // Tamaño del tablero seleccionado en el menú (5, 7 o 9)
  const [boardSize, setBoardSize] = useState(7);

  // ── Handlers de navegación ────────────────────────────────────────────────

  /**
   * Cierra la sesión del usuario y vuelve a la pantalla de inicio.
   * Resetea el nombre de usuario al valor por defecto.
   */
  const logout = () => {
    setUsername('Jugador');
    setView('inicio');
  };

  /**
   * Callback que se ejecuta cuando el usuario se autentica correctamente
   * en la pantalla de inicio. Guarda el nombre y navega al menú.
   */
  const enterFromInicio = (name: string) => {
    setUsername(name || 'Jugador');
    setView('menu');
  };

  /**
   * Callback que se ejecuta cuando el usuario pulsa jugar en el menú.
   * Guarda el modo y tamaño elegidos y navega al tablero.
   */
  const startGame = (name: string, mode: GameMode, size: number) => {
    setUsername(name || 'Jugador');
    setGameMode(mode);
    setBoardSize(size);
    setView('game');
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
      <main className="app">
        {/*
                FadeView envuelve toda la aplicación.
                Cada vez que 'view' cambia, se dispara automáticamente
                la animación de salida de la vista actual y de entrada
                de la nueva vista.
            */}
        <FadeView viewKey={view}>

          {/* Pantalla de login/registro */}
          {view === 'inicio' && (
              <Inicio onEntrar={enterFromInicio} />
          )}

          {/* Lobby de selección de modo */}
          {view === 'menu' && (
              <Menu
                  onLogout={logout}
                  initialUsername={username}
                  onJugar={startGame}
                  onVerHistorial={() => setView('historial')}
              />
          )}

          {/* Tablero de juego */}
          {view === 'game' && (
              <GameBoard
                  username={username}
                  mode={gameMode}
                  boardSize={boardSize}
                  onExit={() => setView('menu')}
              />
          )}

          {view === 'historial' && (
              <Historial
                  username={username}
                  onBack={() => setView('menu')}
              />
          )}

        </FadeView>
      </main>
  );
}
