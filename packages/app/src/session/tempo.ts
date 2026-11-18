/** Wie schnell die Bots ziehen und die Karten fliegen; einstellbar im Menü und auf der Startseite. */
type TempoId = 'ruhig' | 'normal' | 'schnell';

export interface Tempo {
  readonly id: TempoId;
  readonly label: string;
  /** Sichtbare Pause vor jedem Bot-Zug. */
  readonly botPauseMs: number;
  /** Dauer eines Kartenflugs. */
  readonly flightMs: number;
}

export const TEMPOS: readonly Tempo[] = [
  { id: 'ruhig', label: 'Ruhig', botPauseMs: 1600, flightMs: 750 },
  { id: 'normal', label: 'Normal', botPauseMs: 1200, flightMs: 600 },
  { id: 'schnell', label: 'Schnell', botPauseMs: 600, flightMs: 350 },
];

const DEFAULT: Tempo = { id: 'normal', label: 'Normal', botPauseMs: 1200, flightMs: 600 };
const KEY = 'blanko.tempo.v1';

export function tempoById(id: string | null): Tempo {
  return TEMPOS.find((t) => t.id === id) ?? DEFAULT;
}

export function loadTempo(storage: Pick<Storage, 'getItem'>): Tempo {
  try {
    return tempoById(storage.getItem(KEY));
  } catch {
    return DEFAULT;
  }
}

export function saveTempo(storage: Pick<Storage, 'setItem'>, tempo: Tempo): void {
  try {
    storage.setItem(KEY, tempo.id);
  } catch {
    // Ohne Speicher gilt beim nächsten Start wieder „Normal“.
  }
}
