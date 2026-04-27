import { useEffect, useState } from 'react';
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
import Perfil from './pages/Perfil';
import type { BotId, GameVariant } from './GameyApi';
import { DEFAULT_AVATAR_ID } from './avatars';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type View = 'inicio' | 'menu' | 'pregame' | 'game' | 'historial' | 'ranking' | 'perfil';
const AVATAR_STORAGE_KEY = 'yovi.selectedAvatar';
const USERNAME_STORAGE_KEY = 'yovi.username';
const VIEW_STORAGE_KEY = 'yovi.currentView';

function readStoredValue(key: string, defaultValue: string): string {
  if (typeof window === 'undefined') return defaultValue;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== 'function') return defaultValue;
  return storage.getItem(key) || defaultValue;
}

function writeStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  const storage = window.localStorage;
  if (!storage || typeof storage.setItem !== 'function') return;
  storage.setItem(key, value);
}

function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  const storage = window.localStorage;
  if (!storage) return;
  storage.removeItem(USERNAME_STORAGE_KEY);
  storage.removeItem(VIEW_STORAGE_KEY);
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * App es el componente raíz de la aplicación.
 * Gestiona la navegación entre vistas y el estado global compartido
 * (nombre de usuario, modo de juego y tamaño del tablero).
 */
export default function App() {

  // Vista activa actualmente
  const [view, setView] = useState<View>(() => {
    const savedView = readStoredValue(VIEW_STORAGE_KEY, 'inicio') as View;
    // No queremos restaurar la vista de juego directamente si se recarga (mejor volver al menú)
    return (savedView === 'game' || savedView === 'pregame') ? 'menu' : savedView;
  });

  // Nombre del jugador autenticado
  const [username, setUsername] = useState(() => readStoredValue(USERNAME_STORAGE_KEY, 'Jugador'));
  const [avatarId, setAvatarId] = useState(() => readStoredValue(AVATAR_STORAGE_KEY, DEFAULT_AVATAR_ID));

  // Modo de juego seleccionado: 'local' (2 jugadores) o 'bot' (vs IA)
  const [gameMode, setGameMode] = useState<GameMode>('local');

  // Tamaño del tablero seleccionado en el menú (5, 7 o 9)
  const [boardSize, setBoardSize] = useState(7);

  // Seleccion en el menu intermedio
  const [gameVariant, setGameVariant] = useState<GameVariant>('standard');
  const [botId, setBotId] = useState<BotId>('side_bot');
  const [localBlueAvatarId, setLocalBlueAvatarId] = useState(DEFAULT_AVATAR_ID);
  const [localRedAvatarId, setLocalRedAvatarId] = useState('wizard');
  const [inicioAuthMode, setInicioAuthMode] = useState<'login' | 'register'>('login');
  const [gameExitNotice, setGameExitNotice] = useState<string | null>(null);
  const [rankingTab, setRankingTab] = useState(0);

  useEffect(() => {
    writeStoredValue(AVATAR_STORAGE_KEY, avatarId);
  }, [avatarId]);

  useEffect(() => {
    if (username !== 'Jugador') {
      writeStoredValue(USERNAME_STORAGE_KEY, username);
    }
  }, [username]);

  useEffect(() => {
    writeStoredValue(VIEW_STORAGE_KEY, view);
  }, [view]);

  // ── Handlers de navegación ────────────────────────────────────────────────

  /**
   * Cierra la sesión del usuario y vuelve a la pantalla de inicio.
   * Resetea el nombre de usuario al valor por defecto.
   */
  const logout = () => {
    setUsername('Jugador');
    clearStoredSession();
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

  const exitGame = (didResign: boolean) => {
    setGameExitNotice(
      didResign
        ? 'Has abandonado la partida. Se ha registrado como rendición.'
        : 'Partida finalizada. Volviendo al menú.'
    );
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
                  avatarId={avatarId}
                  onJugar={startGame}
                  onVerHistorial={() => setView('historial')}
                  onVerRanking={() => {
                    setRankingTab(0);
                    setView('ranking');
                  }}
                  onVerEstadisticas={() => {
                    setRankingTab(1);
                    setView('ranking');
                  }}
                  onVerPerfil={() => setView('perfil')}
              />
          )}

          {view === 'pregame' && (
              <PreGameMenu
                  username={username}
                  mode={gameMode}
                  boardSize={boardSize}
                  initialVariant={gameVariant}
                  initialBotId={botId}
                  initialBlueAvatarId={localBlueAvatarId}
                  initialRedAvatarId={localRedAvatarId}
                  onBack={() => setView('menu')}
                  onStart={(opts) => {
                    setGameVariant(opts.variant);
                    setBotId(opts.botId);
                    setLocalBlueAvatarId(opts.blueAvatarId);
                    setLocalRedAvatarId(opts.redAvatarId);
                    setView('game');
                  }}
              />
          )}

          {/* Tablero de juego */}
          {view === 'game' && (
              <GameBoard
                  username={username}
                  avatarId={avatarId}
                  blueAvatarId={localBlueAvatarId}
                  redAvatarId={localRedAvatarId}
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
                  initialTab={rankingTab}
                  onBack={() => setView('menu')}
              />
          )}

          {view === 'perfil' && (
              <Perfil
                  username={username}
                  avatarId={avatarId}
                  onSelectAvatar={setAvatarId}
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
