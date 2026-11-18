import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Summary } from './stats.ts';

/** Alles, was ein Lauf festhält. Bewusst ohne Laufzeit, damit gleicher Seed gleiche Dateien ergibt. */
export interface RunResult {
  readonly command: 'simulate' | 'tournament';
  readonly options: Readonly<Record<string, unknown>>;
  readonly summary: Summary;
  /** Elo je Teilnehmer, nur beim Turnier. */
  readonly elo?: Readonly<Record<string, number>>;
}

const RESULTS_DIR = join(import.meta.dirname, '..', 'results');

const fixed = (value: number, digits: number): string => value.toFixed(digits);
const percent = (value: number | null): string =>
  value === null ? '–' : `${fixed(value * 100, 1)} %`;

function rows(result: RunResult): string[][] {
  return result.summary.entrants.map((e) => [
    e.id,
    String(e.seatsPlayed),
    percent(e.winRate),
    fixed(e.avgPlacementPoints, 3),
    fixed(e.avgHandPoints, 2),
    String(e.knocks),
    percent(e.knockSuccessRate),
    result.elo?.[e.id] === undefined ? '' : fixed(result.elo[e.id] ?? 0, 0),
  ]);
}

const HEADER = [
  'Teilnehmer',
  'Plätze',
  'Siegquote',
  'Ø Platzierung',
  'Ø Handpunkte',
  'Klopfen',
  'Klopferfolg',
  'Elo',
];

export function toCsv(result: RunResult): string {
  const lines = [HEADER, ...rows(result)].map((line) =>
    line.map((v) => `"${v.replaceAll('"', '""')}"`).join(','),
  );
  return `${lines.join('\n')}\n`;
}

export function toMarkdown(result: RunResult): string {
  const table = [HEADER, HEADER.map(() => '---'), ...rows(result)].map(
    (line) => `| ${line.join(' | ')} |`,
  );
  const options = Object.entries(result.options).map(
    ([key, value]) => `- ${key}: ${JSON.stringify(value)}`,
  );
  return [
    `# Labor: ${result.command}`,
    '',
    ...options,
    '',
    `${String(result.summary.rounds)} Runden, Ø ${fixed(result.summary.avgTurns, 1)} Züge pro Runde.`,
    '',
    ...table,
    '',
  ].join('\n');
}

/** Schreibt JSON, CSV und Markdown-Bericht in einen eigenen Ordner und liefert dessen Pfad. */
export function writeResult(result: RunResult, seed: number): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const dir = join(RESULTS_DIR, `${result.command}-seed${String(seed)}-${stamp}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(dir, 'summary.csv'), toCsv(result));
  writeFileSync(join(dir, 'report.md'), toMarkdown(result));
  return dir;
}
