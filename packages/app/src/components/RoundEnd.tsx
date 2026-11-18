import type { RoundScore } from '@blanko/engine';
import type { Session } from '../session/session.ts';

interface RoundEndProps {
  readonly session: Session;
  readonly score: RoundScore;
  readonly knocker: number | null;
  /** Veränderung der Spielerwertung durch diese Runde. */
  readonly ratingChange: number;
  /** Im dynamischen Modus: Wertung der Gegner in der nächsten Runde. */
  readonly nextOpponentRating: number | null;
  readonly onNext: () => void;
  readonly onEnd: () => void;
}

const signed = (value: number): string => (value > 0 ? `+${String(value)}` : String(value));

/** Wertung nach dem Aufdecken: Handpunkte, Platz und Platzierungspunkte jedes Spielers. */
export function RoundEnd({
  session,
  score,
  knocker,
  ratingChange,
  nextOpponentRating,
  onNext,
  onEnd,
}: RoundEndProps) {
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
                {session.names[player]}
                {player === knocker ? ' (klopfte)' : ''}
              </td>
              <td className="num">{score.handPoints[player]}</td>
              <td className="num">{signed(score.placementPoints[player] ?? 0)}</td>
              <td className="num">{signed(session.totals[player] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="rating-line">
        Deine Stärke {signed(Math.round(ratingChange))}
        {nextOpponentRating === null
          ? ''
          : ` · nächste Gegner: Stärke ${String(nextOpponentRating)}`}
      </p>
      <div className="button-row">
        <button type="button" className="main-button" onClick={onEnd}>
          Sitzung beenden
        </button>
        <button type="button" className="main-button knock" onClick={onNext}>
          Nächste Runde
        </button>
      </div>
    </div>
  );
}
