import type { Level } from '../profiles.ts';
import type { Stats } from '../session/stats.ts';

interface StatsPageProps {
  readonly stats: Stats;
  readonly levels: readonly Level[];
  readonly rating: number;
  readonly onBack: () => void;
}

const average = (sum: number, count: number): string =>
  count === 0 ? '–' : (sum / count).toFixed(2);

/** Statistik über alle Sitzungen auf diesem Gerät. */
export function StatsPage({ stats, levels, rating, onBack }: StatsPageProps) {
  const rows = [
    ...levels.map((l) => ({ key: l.level, label: l.label })),
    { key: 'dynamisch', label: 'Dynamisch' },
  ];
  const winRate = stats.rounds === 0 ? '–' : `${((stats.wins / stats.rounds) * 100).toFixed(0)} %`;
  return (
    <div className="overlay page">
      <h2>Statistik</h2>
      <table>
        <tbody>
          <tr>
            <th>Deine Stärke</th>
            <td>{Math.round(rating)}</td>
          </tr>
          <tr>
            <th>Sitzungen</th>
            <td>{stats.sessions}</td>
          </tr>
          <tr>
            <th>Runden</th>
            <td>{stats.rounds}</td>
          </tr>
          <tr>
            <th>Rundensiege</th>
            <td>{winRate}</td>
          </tr>
          <tr>
            <th>Ø Platzierungspunkte</th>
            <td>{average(stats.placementPoints, stats.rounds)}</td>
          </tr>
          {rows.map((row) => {
            const entry = stats.byLevel[row.key];
            return (
              <tr key={row.key}>
                <th>Ø {row.label}</th>
                <td>
                  {entry === undefined
                    ? '–'
                    : `${average(entry.placementPoints, entry.rounds)} (${String(entry.rounds)} Runden)`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted">Gespeichert nur auf diesem Gerät.</p>
      <button type="button" className="main-button" onClick={onBack}>
        Zurück
      </button>
    </div>
  );
}
