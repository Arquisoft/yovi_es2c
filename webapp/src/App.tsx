import { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import './App.css';
import './styles/Additions.css';
import Inicio from './pages/Inicio';
import Menu from './pages/Menu';
import Historial from './pages/Historial';
import GameBoard, { type GameMode } from './GameBoard';
import FadeView from './FadeView';
import Ranking from './pages/Ranking';
import PreGameMenu from './pages/PreGameMenu';
import type { BotId, GameVariant } from './GameyApi';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type View = 'inicio' | 'menu' | 'pregame' | 'game' | 'historial' | 'ranking';

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

  // Seleccion en el menu intermedio
  const [gameVariant, setGameVariant] = useState<GameVariant>('standard');
  const [botId, setBotId] = useState<BotId>('side_bot');
  const [inicioAuthMode, setInicioAuthMode] = useState<'login' | 'register'>('login');
  const [gameExitNotice, setGameExitNotice] = useState<string | null>(null);

  // ── Handlers de navegación ────────────────────────────────────────────────

  /**
   * Cierra la sesión del usuario y vuelve a la pantalla de inicio.
   * Resetea el nombre de usuario al valor por defecto.
   */
  const logout = () => {
    setUsername('Jugador');
    setInicioAuthMode('register');
    setView('inicio');
  };

  /**
   * Callback que se ejecuta cuando el usuario se autentica correctamente
   * en la pantalla de inicio. Guarda el nombre y navega al menú.
   */
  const enterFromInicio = (name: string) => {
    setUsername(name || 'Jugador');
    setInicioAuthMode('login');
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
    setView('pregame');
  };

  const exitGame = () => {
    setGameExitNotice('Has abandonado la partida. Se ha registrado como rendición.');
    setView('menu');
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
              <Inicio onEntrar={enterFromInicio} initialAuthMode={inicioAuthMode} />
          )}

          {/* Lobby de selección de modo */}
          {view === 'menu' && (
              <Menu
                  onLogout={logout}
                  initialUsername={username}
                  onJugar={startGame}
                  onVerHistorial={() => setView('historial')}
                  onVerRanking={() => setView('ranking')}
              />
          )}

          {view === 'pregame' && (
              <PreGameMenu
                  username={username}
                  mode={gameMode}
                  boardSize={boardSize}
                  initialVariant={gameVariant}
                  initialBotId={botId}
                  onBack={() => setView('menu')}
                  onStart={(opts) => {
                    setGameVariant(opts.variant);
                    setBotId(opts.botId);
                    setView('game');
                  }}
              />
          )}

          {/* Tablero de juego */}
          {view === 'game' && (
              <GameBoard
                  username={username}
                  mode={gameMode}
                  boardSize={boardSize}
                  variant={gameVariant}
                  botId={botId}
                  onExit={exitGame}
              />
          )}

          {view === 'historial' && (
              <Historial
                  username={username}
                  onBack={() => setView('menu')}
              />
          )}

          {view === 'ranking' && (
              <Ranking
                  username={username}
                  onBack={() => setView('menu')}
              />
          )}

        </FadeView>
        <Snackbar
            open={Boolean(gameExitNotice)}
            autoHideDuration={3500}
            onClose={() => setGameExitNotice(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
              onClose={() => setGameExitNotice(null)}
              severity="info"
              variant="filled"
              sx={{ width: '100%' }}
          >
            {gameExitNotice}
          </Alert>
        </Snackbar>
      </main>
  );
}
