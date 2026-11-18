/** Statistik über alle Sitzungen, lokal auf dem Gerät gespeichert. */
export interface Stats {
  readonly sessions: number;
  readonly rounds: number;
  readonly wins: number;
  readonly placementPoints: number;
  /** Je Stufe: Runden und Summe der Platzierungspunkte. */
  readonly byLevel: Readonly<
    Record<string, { readonly rounds: number; readonly placementPoints: number }>
  >;
}

const KEY = 'blanko.stats.v1';
export const EMPTY_STATS: Stats = {
  sessions: 0,
  rounds: 0,
  wins: 0,
  placementPoints: 0,
  byLevel: {},
};

export function addSession(stats: Stats): Stats {
  return { ...stats, sessions: stats.sessions + 1 };
}

export function addRound(
  stats: Stats,
  level: string,
  placementPoints: number,
  won: boolean,
): Stats {
  const previous = stats.byLevel[level] ?? { rounds: 0, placementPoints: 0 };
  return {
    ...stats,
    rounds: stats.rounds + 1,
    wins: stats.wins + (won ? 1 : 0),
    placementPoints: stats.placementPoints + placementPoints,
    byLevel: {
      ...stats.byLevel,
      [level]: {
        rounds: previous.rounds + 1,
        placementPoints: previous.placementPoints + placementPoints,
      },
    },
  };
}

/** Kaputte oder fehlende Daten ergeben eine leere Statistik statt eines Absturzes. */
export function loadStats(storage: Pick<Storage, 'getItem'>): Stats {
  try {
    const raw = storage.getItem(KEY);
    if (raw === null) return EMPTY_STATS;
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return typeof parsed.rounds === 'number' ? { ...EMPTY_STATS, ...parsed } : EMPTY_STATS;
  } catch {
    return EMPTY_STATS;
  }
}

export function saveStats(storage: Pick<Storage, 'setItem'>, stats: Stats): void {
  try {
    storage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Privater Modus oder voller Speicher: Die Statistik ist verzichtbar, das Spiel läuft weiter.
  }
}
