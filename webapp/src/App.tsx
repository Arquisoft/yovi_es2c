import { useState } from 'react';
import './App.css';
import Inicio from './pages/Inicio';
import Menu from './pages/Menu';
import GameBoard, { type GameMode } from './GameBoard';

type View = 'inicio' | 'menu' | 'game';

export default function App() {
  const [view, setView] = useState<View>('inicio');
  const [username, setUsername] = useState('Jugador');
  const [gameMode, setGameMode] = useState<GameMode>('local');

  const startGame = (name: string, mode: GameMode) => {
    setUsername(name || 'Jugador');
    setGameMode(mode);
    setView('game');
  };

  return (
      <main className="app">
        {view === 'inicio' && (
            <Inicio onEntrar={() => setView('menu')} />
        )}
        {view === 'menu' && (
            <Menu
                onVolver={() => setView('inicio')}
                onJugar={startGame}
            />
        )}
        {view === 'game' && (
            <GameBoard
                username={username}
                mode={gameMode}
                boardSize={8}
                onExit={() => setView('menu')}
            />
        )}
      </main>
  );
}