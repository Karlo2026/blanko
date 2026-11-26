import type { RoundScore } from '@blanko/engine';
import { signed } from '../session/display.ts';

interface RoundEndProps {
  readonly names: readonly string[];
  /** Summen einschließlich dieser Runde. */
  readonly totals: readonly number[];
  readonly score: RoundScore;
  readonly knocker: number | null;
  /** Zeile unter der Tabelle, etwa die Veränderung der Spielerwertung. */
  readonly note: string;
  /** Null, wenn man auf jemand anderen warten muss (online startet der Gastgeber). */
  readonly onNext: (() => void) | null;
  readonly onEnd: () => void;
}

/** Wertung nach dem Aufdecken: Handpunkte, Platz und Platzierungspunkte jedes Spielers. */
export function RoundEnd({ names, totals, score, knocker, note, onNext, onEnd }: RoundEndProps) {
  return (
    <div className="round-end" role="dialog" aria-label="Rundenende">
      <h2>Runde vorbei</h2>
      <table className="results">
        <thead>
          <tr>
            <th>Platz</th>
            <th>Spieler</th>
            <th className="num">Hand</th>
            <th className="num">Punkte</th>
            <th className="num">Summe</th>
          </tr>
        </thead>
        <tbody>
          {score.ranking.map((player, place) => (
            <tr key={player}>
              <td>{place + 1}.</td>
              <td>
                {names[player]}
                {player === knocker ? ' (klopfte)' : ''}
              </td>
              <td className="num">{score.handPoints[player]}</td>
              <td className="num">{signed(score.placementPoints[player] ?? 0)}</td>
              <td className="num">{signed(totals[player] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note === '' ? null : <p className="rating-line">{note}</p>}
      <div className="button-row">
        <button type="button" className="main-button" onClick={onEnd}>
          Sitzung beenden
        </button>
        {onNext === null ? null : (
          <button type="button" className="main-button knock" onClick={onNext}>
            Nächste Runde
          </button>
        )}
      </div>
    </div>
  );
}
