interface MenuProps {
  readonly onResume: () => void;
  readonly onRules: () => void;
  readonly onStats: () => void;
  readonly onEnd: () => void;
}

export function Menu({ onResume, onRules, onStats, onEnd }: MenuProps) {
  return (
    <div className="overlay" role="dialog" aria-label="Menü">
      <h2>Menü</h2>
      <button type="button" className="main-button knock" onClick={onResume}>
        Weiterspielen
      </button>
      <button type="button" className="main-button" onClick={onRules}>
        Regeln
      </button>
      <button type="button" className="main-button" onClick={onStats}>
        Statistik
      </button>
      <button type="button" className="main-button" onClick={onEnd}>
        Sitzung beenden
      </button>
    </div>
  );
}
