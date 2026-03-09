import { useState } from 'react';
import type { GameMode } from '../GameBoard';

const BOARD_SIZE_OPTIONS = [5, 7, 9] as const;

type MenuProps = {
    onLogout: () => void;
    initialUsername: string;
    onJugar: (username: string, mode: GameMode, boardSize: number) => void;
};

export default function Menu({ onLogout, onJugar, initialUsername }: MenuProps) {
    const [boardSize, setBoardSize] = useState<number>(7);

    const launch = (mode: GameMode) => {
        const chosenUsername = initialUsername || 'Jugador';
        onJugar(chosenUsername, mode, boardSize);
    };

    return (
        <section className="menu">
            <header className="menu__top">
                <div>
                    <p className="menu__eyebrow">GAME LOBBY</p>
                    <h2 className="menu__title">Elige Tu Modo</h2>
                </div>
                <div className="menu__actions">
                    <button className="menu__back" onClick={onLogout}>
                        Desconectar
                    </button>
                </div>
            </header>

            <section className="menu__size-picker panel" aria-label="Selector de tamaño de tablero">
                <p className="menu__size-title">Tamaño del tablero</p>
                <div className="menu__size-options">
                    {BOARD_SIZE_OPTIONS.map((size) => (
                        <button
                            key={size}
                            className={`menu__size-btn ${boardSize === size ? 'menu__size-btn--active' : ''}`}
                            onClick={() => setBoardSize(size)}
                            type="button"
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <p className="menu__size-hint">
                    Lados del triángulo: {boardSize} celdas.
                </p>
            </section>

            {/* Mode cards */}
            <div className="menu__grid">
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
