import { useState } from 'react';
import './App.css';
import Inicio from './pages/Inicio';
import Menu from './pages/Menu';

function App() {
  const [view, setView] = useState<'inicio' | 'menu'>('inicio');

  return (
    <main className="app">
      {view === 'inicio' ? (
        <Inicio onEntrar={() => setView('menu')} />
      ) : (
        <Menu onVolver={() => setView('inicio')} />
      )}
    </main>
  );
}

export default App;
