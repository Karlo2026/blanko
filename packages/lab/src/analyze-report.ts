import { MAX_PLAYERS, MIN_PLAYERS } from '@blanko/engine';
import type { Analysis } from './analyze.ts';
import { meanOf, standardErrorOf, type Tally } from './tally.ts';

/** Zellen mit weniger Beobachtungen sind zu unsicher für eine Aussage. */
const MIN_SAMPLES = 30;
const PROGRESS = ['1. Tischrunde', '2.–3.', '4.–6.', '7.+'];

const signed = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
const cell = (tally: Tally | undefined): string =>
  tally === undefined || tally.n < MIN_SAMPLES ? '·' : signed(meanOf(tally));
const bucketStart = (bucket: string): number => Number.parseInt(bucket, 10);
const table = (header: string[], rows: string[][]): string[] =>
  [header, header.map(() => '---'), ...rows].map((row) => `| ${row.join(' | ')} |`);

/** Höchste Schätzung, bei der Klopfen gegenüber Weiterspielen im Mittel gewinnt. */
function knockLimit(
  analysis: Analysis,
  players: number,
  progress: string,
  buckets: readonly string[],
): string {
  const winning = buckets.filter((b) => {
    const tally = analysis.knock.get(`${String(players)}|${b}|${progress}`);
    return tally !== undefined && tally.n >= MIN_SAMPLES && meanOf(tally) > 0;
  });
  return winning.at(-1) ?? '–';
}

function knockSection(analysis: Analysis): string[] {
  const buckets = [...new Set([...analysis.knock.keys()].map((k) => k.split('|')[1] ?? ''))].sort(
    (a, b) => bucketStart(a) - bucketStart(b),
  );
  const lines = [
    '## Ab welcher geschätzten Punktzahl lohnt sich das Klopfen?',
    '',
    'Platzierungspunkte „jetzt klopfen“ minus „ziehen und normal weiterspielen“. Positiv: Klopfen lohnt sich.',
    'Schätzung wie der Bot sie sieht (unbekannte Karten mit Erwartungswert).',
    '',
    '### Grenze: bis zu welcher Schätzung Klopfen gewinnt',
    '',
    ...table(
      ['Spieler', ...PROGRESS],
      Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => {
        const players = MIN_PLAYERS + i;
        return [String(players), ...PROGRESS.map((p) => knockLimit(analysis, players, p, buckets))];
      }),
    ),
  ];
  for (let players = MIN_PLAYERS; players <= MAX_PLAYERS; players++) {
    lines.push(
      '',
      `### ${String(players)} Spieler`,
      '',
      ...table(
        ['Schätzung', ...PROGRESS],
        buckets.map((b) => [
          b,
          ...PROGRESS.map((p) => cell(analysis.knock.get(`${String(players)}|${b}|${p}`))),
        ]),
      ),
    );
  }
  return lines;
}

function swapSection(analysis: Analysis): string[] {
  const order = ['1–3', '4–6', '7–9', '10', 'verdeckt'];
  const rows = order.flatMap((own) =>
    order.map((target) => [
      own,
      target,
      cell(analysis.swap.get(`${own}|${target}|Ziel führt`)),
      cell(analysis.swap.get(`${own}|${target}|Ziel führt nicht`)),
    ]),
  );
  return [
    '## Wann lohnt sich der 10-Tausch, und mit wem?',
    '',
    'Platzierungspunkte „tauschen“ minus „10 einfach ablegen“, nach Punktwert der eigenen und der Zielkarte',
    '(soweit bekannt) und danach, ob der Gegner geschätzt führt.',
    '',
    ...table(['eigene Karte', 'Zielkarte', 'Ziel führt', 'Ziel führt nicht'], rows),
  ];
}

function suspicionSection(analysis: Analysis): string[] {
  const order = ['unter 5 %', '5–10 %', '10–20 %', '20 % und mehr'];
  return [
    '## Wann lohnt sich das Ablegen auf Verdacht?',
    '',
    'Platzierungspunkte „unbekannte Karte auf Verdacht ablegen“ minus „normale Wahl“,',
    'nach Wahrscheinlichkeit, dass die Karte passt.',
    '',
    ...table(
      ['Trefferchance', 'Differenz', 'Std.-Fehler', 'Fälle'],
      order.map((key) => {
        const tally = analysis.suspicion.get(key);
        return tally === undefined
          ? [key, '·', '·', '0']
          : [key, signed(meanOf(tally)), standardErrorOf(tally).toFixed(3), String(tally.n)];
      }),
    ),
  ];
}

function pairSection(analysis: Analysis): string[] {
  const value = (key: string): string => {
    const tally = analysis.pairs.get(key);
    return tally === undefined ? '·' : `${meanOf(tally).toFixed(2)} (${String(tally.n)} Hände)`;
  };
  return [
    '## Wie viel bringen Paare gleichen Rangs?',
    '',
    `- Gesparte Punkte je Endhand im Schnitt: ${value('gesparte Punkte je Hand')}`,
    `- Ø Platzierungspunkte mit Paar: ${value('mit Paar: Platzierung')}`,
    `- Ø Platzierungspunkte ohne Paar: ${value('ohne Paar: Platzierung')}`,
  ];
}

const toObject = (
  map: Map<string, Tally>,
): Record<string, { n: number; mean: number; standardError: number }> =>
  Object.fromEntries(
    [...map].map(([key, t]) => [
      key,
      { n: t.n, mean: meanOf(t), standardError: standardErrorOf(t) },
    ]),
  );

export function analysisFiles(
  analysis: Analysis,
  profileId: string,
  seed: number,
): Record<string, string> {
  const markdown = [
    `# Labor: analyze (${profileId})`,
    '',
    `${String(analysis.rounds)} Runden, gleichmäßig 2 bis 6 Spieler, Seed ${String(seed)}. Alle Plätze spielen ${profileId};`,
    'an zufällig gewählten Entscheidungspunkten werden zwei Alternativen mit denselben Zufallszahlen',
    `zu Ende gespielt. „·“: weniger als ${String(MIN_SAMPLES)} Fälle.`,
    '',
    ...knockSection(analysis),
    '',
    ...swapSection(analysis),
    '',
    ...suspicionSection(analysis),
    '',
    ...pairSection(analysis),
    '',
  ].join('\n');
  const sections = {
    knock: toObject(analysis.knock),
    swap: toObject(analysis.swap),
    suspicion: toObject(analysis.suspicion),
    pairs: toObject(analysis.pairs),
  };
  const csv = Object.entries(sections).flatMap(([section, cells]) =>
    Object.entries(cells).map(
      ([key, t]) =>
        `${section},"${key}",${String(t.n)},${t.mean.toFixed(4)},${t.standardError.toFixed(4)}`,
    ),
  );
  return {
    'result.json': `${JSON.stringify({ profile: profileId, rounds: analysis.rounds, seed, ...sections }, null, 2)}\n`,
    'analysis.csv': `Abschnitt,Zelle,Fälle,Mittel,Std.-Fehler\n${csv.join('\n')}\n`,
    'report.md': markdown,
  };
}
