import RegisterForm from '../RegisterForm';

type InicioProps = {
    onEntrar: (username: string) => void;
};

export default function Inicio({ onEntrar }: InicioProps) {
    return (
        <section className="inicio">
            <div className="inicio__photo" />
            <div className="inicio__shade" />
            <div className="inicio__ribbon inicio__ribbon--blue" />
            <div className="inicio__ribbon inicio__ribbon--red" />

            <div className="inicio__content panel">
                <span className="inicio__badge">SEASON LIVE</span>
                <h1 className="inicio__title">YOVI ARENA</h1>

                <p className="inicio__subtitle">
                    Tablero triangular, bolas rojas y azules, y pura precision en cada jugada.
                </p>

                <div className="inicio__board-frame">
                    <img
                        src="/tri-billiard.svg"
                        alt="Tablero triangular con bolas rojas y azules"
                    />
                </div>

                <div className="inicio__chips">
                    <span>12.8K jugadores</span>
                    <span>Servidor online</span>
                    <span>Modo competitivo</span>
                </div>

                <div className="inicio__actions">
                    <RegisterForm onRegisterSuccess={onEntrar} />
                </div>
            </div>
        </section>
    );
}
