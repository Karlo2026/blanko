import { useState } from 'react';
import type { Level } from '../profiles.ts';
import { nearestLevel } from '../session/rating.ts';
import { MAX_BOTS, type SessionMode } from '../session/session.ts';

interface StartScreenProps {
  readonly levels: readonly Level[];
  /** Aktuelle Spielerwertung, angezeigt und Grundlage für den dynamischen Modus. */
  readonly rating: number;
  readonly onStart: (mode: SessionMode, botCount: number) => void;
  readonly onRules: () => void;
  readonly onStats: () => void;
}

const BOT_COUNTS = Array.from({ length: MAX_BOTS }, (_, i) => i + 1);
const DYNAMIC = 'dynamisch';

/** Vor der Sitzung: Zahl der Gegner und Stufe wählen. */
export function StartScreen({ levels, rating, onStart, onRules, onStats }: StartScreenProps) {
  const [botCount, setBotCount] = useState(3);
  const [levelId, setLevelId] = useState(levels[1]?.level ?? levels[0]?.level ?? '');
  const level = levels.find((l) => l.level === levelId);
  const mode: SessionMode | null =
    levelId === DYNAMIC
      ? { kind: 'dynamic' }
      : level === undefined
        ? null
        : { kind: 'fixed', level };
  const near = nearestLevel(levels, rating);
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
        <button
          type="button"
          role="radio"
          aria-checked={levelId === DYNAMIC}
          className={`choice${levelId === DYNAMIC ? ' active' : ''}`}
          onClick={() => {
            setLevelId(DYNAMIC);
          }}
        >
          Dynamisch
        </button>
      </div>
      <p className="hint-text">
        Deine Stärke: {Math.round(rating)}
        {near === undefined ? '' : ` (etwa ${near.label})`}.
        {levelId === DYNAMIC ? ' Dynamisch wählt jede Runde Gegner, die so stark sind wie du.' : ''}
      </p>
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
          disabled={mode === null}
          onClick={() => {
            if (mode !== null) onStart(mode, botCount);
          }}
        >
          Spiel starten
        </button>
      </div>
    </div>
  );
}
