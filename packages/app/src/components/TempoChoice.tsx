import { TEMPOS, type Tempo } from '../session/tempo.ts';

interface TempoChoiceProps {
  readonly tempo: Tempo;
  readonly onChange: (tempo: Tempo) => void;
}

/** Wahl zwischen ruhigem, normalem und schnellem Spieltempo. */
export function TempoChoice({ tempo, onChange }: TempoChoiceProps) {
  return (
    <div className="choices" role="radiogroup" aria-label="Tempo">
      {TEMPOS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={t.id === tempo.id}
          className={`choice${t.id === tempo.id ? ' active' : ''}`}
          onClick={() => {
            onChange(t);
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
