import type { GameMode } from '../GameBoard';

type MenuProps = {
    onVolver: () => void;
    initialUsername: string;
    onJugar: (username: string, mode: GameMode) => void;
};

export default function Menu({ onVolver, onJugar, initialUsername }: MenuProps) {
    const launch = (mode: GameMode) => {
        const chosenUsername = initialUsername || 'Jugador';
        onJugar(chosenUsername, mode);
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
