import { useState } from 'react';
import type { GameMode } from '../GameBoard';

type MenuProps = {
    onVolver: () => void;
    onJugar: (username: string, mode: GameMode) => void;
};

export default function Menu({ onVolver, onJugar }: MenuProps) {
    const [username, setUsername] = useState('');
    const [nameError, setNameError] = useState('');

    const launch = (mode: GameMode) => {
        if (!username.trim()) {
            setNameError('Introduce tu nombre para jugar');
            return;
        }
        setNameError('');
        onJugar(username.trim(), mode);
    };

    return (
        <section className="menu">
            <header className="menu__top">
                <div>
                    <p className="menu__eyebrow">GAME LOBBY</p>
                    <h2 className="menu__title">Elige Tu Modo</h2>
                </div>
                <button className="menu__back" onClick={onVolver}>
                    Volver al inicio
                </button>
            </header>

            {/* Username field */}
            <div className="menu__username-row panel">
                <label className="menu__username-label" htmlFor="username-input">
                    Tu nombre de jugador
                </label>
                <input
                    id="username-input"
                    className="menu__username-input"
                    type="text"
                    placeholder="Ej. AlphaGamer"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.target.value);
                        if (nameError) setNameError('');
                    }}
                    maxLength={24}
                />
                {nameError && <p className="menu__name-error">{nameError}</p>}
            </div>

            {/* Mode cards */}
            <div className="menu__grid" style={{ marginTop: 14 }}>
                <button
                    className="menu__card panel tone-blue"
                    onClick={() => launch('local')}
                    type="button"
                >
                    <span className="menu__icon">👥</span>
                    <span className="menu__card-title">Partida Local</span>
                    <span className="menu__card-subtitle">2 jugadores en la misma pantalla</span>
                </button>

                <button
                    className="menu__card panel tone-red"
                    onClick={() => launch('bot')}
                    type="button"
                >
                    <span className="menu__icon">🤖</span>
                    <span className="menu__card-title">Vs IA Bot</span>
                    <span className="menu__card-subtitle">Juega contra el motor de Gamey</span>
                </button>

                <button className="menu__card panel tone-gold" type="button" disabled>
                    <span className="menu__icon">🏆</span>
                    <span className="menu__card-title">Liga Ranked</span>
                    <span className="menu__card-subtitle">Próximamente</span>
                </button>

                <button className="menu__card panel tone-cyan" type="button" disabled>
                    <span className="menu__icon">🎯</span>
                    <span className="menu__card-title">Misiones Diarias</span>
                    <span className="menu__card-subtitle">Próximamente</span>
                </button>
            </div>

            <footer className="menu__footer">Conéctate al servidor Gamey para jugar</footer>
        </section>
    );
}