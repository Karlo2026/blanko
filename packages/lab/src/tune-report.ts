import type { TuneOptions, TuneResult } from './tune.ts';

const signed = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(3)}`;

function historyRows(result: TuneResult): string[][] {
  return result.history.map((g) => [
    String(g.generation),
    signed(g.bestScreening.mean),
    signed(g.confirmation.mean),
    g.confirmation.standardError.toFixed(3),
    g.accepted ? 'ja' : 'nein',
  ]);
}

const HEADER = ['Generation', 'Vorauswahl', 'Bestätigung', 'Std.-Fehler', 'Neuer Champion'];

export function tuneFiles(result: TuneResult, options: TuneOptions): Record<string, string> {
  const csv = [HEADER, ...historyRows(result)].map((row) => row.join(',')).join('\n');
  const table = [HEADER, HEADER.map(() => '---'), ...historyRows(result)].map(
    (row) => `| ${row.join(' | ')} |`,
  );
  const markdown = [
    `# Labor: tune (${options.method})`,
    '',
    `Start: ${result.start.id}, ${String(options.generations)} Generationen à ${String(options.candidates)} Kandidaten, ${String(options.games)} Runden je Bewertung, Seed ${String(options.seed)}.`,
    'Werte: Ø Platzierungspunkte des Herausforderers gegen den jeweiligen Champion (2 bis 6 Spieler).',
    '',
    ...table,
    '',
    '## Ergebnis',
    '',
    '```json',
    JSON.stringify(result.tuned.rule, null, 2),
    '```',
    '',
  ].join('\n');
  return {
    'result.json': `${JSON.stringify({ options, ...result }, null, 2)}\n`,
    'history.csv': `${csv}\n`,
    'report.md': markdown,
    'profile.json': `${JSON.stringify(result.tuned, null, 2)}\n`,
  };
}
