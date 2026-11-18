import { useState } from 'react';
import type { Level } from '../profiles.ts';
import { MAX_BOTS } from '../session/session.ts';

interface StartScreenProps {
  readonly levels: readonly Level[];
  readonly onStart: (level: Level, botCount: number) => void;
  readonly onRules: () => void;
  readonly onStats: () => void;
}

const BOT_COUNTS = Array.from({ length: MAX_BOTS }, (_, i) => i + 1);

/** Vor der Sitzung: Zahl der Gegner und Stufe wählen. */
export function StartScreen({ levels, onStart, onRules, onStats }: StartScreenProps) {
  const [botCount, setBotCount] = useState(3);
  const [levelId, setLevelId] = useState(levels[1]?.level ?? levels[0]?.level ?? '');
  const level = levels.find((l) => l.level === levelId);
  return (
    <div className="screen start">
      <p className="title">Blanko</p>
      <p className="subtitle">Wer am Ende am wenigsten vor sich liegen hat, gewinnt.</p>
      <h2>Gegner</h2>
      <div className="choices" role="radiogroup" aria-label="Zahl der Gegner">
        {BOT_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            role="radio"
            aria-checked={count === botCount}
            className={`choice${count === botCount ? ' active' : ''}`}
            onClick={() => {
              setBotCount(count);
            }}
          >
            {count}
          </button>
        ))}
      </div>
      <h2>Stufe</h2>
      <div className="choices" role="radiogroup" aria-label="Stufe">
        {levels.map((l) => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={l.level === levelId}
            className={`choice${l.level === levelId ? ' active' : ''}`}
            onClick={() => {
              setLevelId(l.level);
            }}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="button-row go">
        <button type="button" className="text-button" onClick={onRules}>
          Regeln
        </button>
        <button type="button" className="text-button" onClick={onStats}>
          Statistik
        </button>
      </div>
      <div className="main-button-area">
        <button
          type="button"
          className="main-button knock"
          disabled={level === undefined}
          onClick={() => {
            if (level !== undefined) onStart(level, botCount);
          }}
        >
          Spiel starten
        </button>
      </div>
    </div>
  );
}
