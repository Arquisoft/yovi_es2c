import { useState } from 'react';
import './App.css';
import './styles/Additions.css';
import Inicio from './pages/Inicio';
import Menu from './pages/Menu';
import GameBoard, { type GameMode } from './GameBoard';

type View = 'inicio' | 'menu' | 'game';

export default function App() {
  const [view, setView] = useState<View>('inicio');
  const [username, setUsername] = useState('Jugador');
  const [gameMode, setGameMode] = useState<GameMode>('local');

  const enterFromInicio = (name: string) => {
    setUsername(name || 'Jugador');
    setView('menu');
  };

  const startGame = (name: string, mode: GameMode) => {
    setUsername(name || 'Jugador');
    setGameMode(mode);
    setView('game');
  };

  return (
      <main className="app">
        {view === 'inicio' && (
            <Inicio onEntrar={enterFromInicio} />
        )}
        {view === 'menu' && (
            <Menu
                onVolver={() => setView('inicio')}
                initialUsername={username}
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
