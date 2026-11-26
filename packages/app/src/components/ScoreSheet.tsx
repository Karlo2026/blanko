import { signed } from '../session/display.ts';

interface ScoreSheetProps {
  readonly names: readonly string[];
  readonly totals: readonly number[];
}

/** Punktezettel aus Karopapier mit den Sitzungspunkten aller Spieler. */
export function ScoreSheet({ names, totals }: ScoreSheetProps) {
  return (
    <div className="score-sheet" aria-label="Punktezettel">
      <table>
        <thead>
          <tr>
            {names.map((name) => (
              <th key={name}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {totals.map((total, player) => (
              <td key={names[player]}>{signed(total)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
