type MenuProps = {
  onVolver: () => void;
};

const options = [
  { title: 'Partida Rapida', subtitle: 'Salta directo al combate', icon: '01', tone: 'tone-blue' },
  { title: 'Liga Ranked', subtitle: 'Escala posiciones globales', icon: '02', tone: 'tone-red' },
  { title: 'Personalizacion', subtitle: 'Configura avatar y equipo', icon: '03', tone: 'tone-gold' },
  { title: 'Misiones Diarias', subtitle: 'Completa retos y gana oro', icon: '04', tone: 'tone-cyan' },
];

export default function Menu({ onVolver }: MenuProps) {
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

      <div className="menu__grid">
        {options.map((item) => (
          <button key={item.title} className={`menu__card panel ${item.tone}`}>
            <span className="menu__icon">{item.icon}</span>
            <span className="menu__card-title">{item.title}</span>
            <span className="menu__card-subtitle">{item.subtitle}</span>
          </button>
        ))}
      </div>

      <footer className="menu__footer">Listo para jugar</footer>
    </section>
  );
}
