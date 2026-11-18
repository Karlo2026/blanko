// Kommandozeile des Simulationslabors. Aufruf aus dem Wurzelverzeichnis: npm run lab -- <befehl> [optionen]
import { parseArgs } from 'node:util';
import { simulate, tournament, type RunOptions } from './commands.ts';
import { DEFAULT_WORKERS } from './parallel.ts';
import { availableProfileIds, loadEntrant } from './profile-store.ts';
import { toMarkdown, writeResult, type RunResult } from './report.ts';

const USAGE = `Blanko-Labor

  npm run lab -- simulate   --seats basis,basis,zufall,zufall [--games 10000] [--seed 1] [--workers N]
  npm run lab -- tournament [--profiles a,b,c] [--players 4] [--games 20000] [--seed 1] [--workers N]

Profile liegen in packages/lab/profiles; „zufall“ ist der eingebaute Zufalls-Bot.
Ohne --profiles spielt das Turnier mit allen vorhandenen Profilen.`;

const OPTIONS = {
  seats: { type: 'string' },
  profiles: { type: 'string' },
  players: { type: 'string', default: '4' },
  games: { type: 'string' },
  seed: { type: 'string', default: '1' },
  workers: { type: 'string', default: String(DEFAULT_WORKERS) },
  help: { type: 'boolean', default: false },
} as const;

function positiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} braucht eine positive ganze Zahl, nicht „${value}“`);
  }
  return parsed;
}

const list = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

async function run(
  command: string | undefined,
  values: Record<string, string | boolean | undefined>,
): Promise<RunResult | null> {
  const text = (key: string): string | undefined => {
    const value = values[key];
    return typeof value === 'string' ? value : undefined;
  };
  const options = (defaultGames: number): RunOptions => ({
    games: positiveInt(text('games') ?? String(defaultGames), 'games'),
    seed: positiveInt(text('seed') ?? '1', 'seed'),
    workers: positiveInt(text('workers') ?? '1', 'workers'),
  });
  switch (command) {
    case 'simulate': {
      const seats = text('seats');
      if (seats === undefined) throw new Error('simulate braucht --seats');
      return simulate(list(seats).map(loadEntrant), options(10_000));
    }
    case 'tournament': {
      const ids = list(text('profiles') ?? availableProfileIds().join(','));
      return tournament(
        ids.map(loadEntrant),
        positiveInt(text('players') ?? '4', 'players'),
        options(20_000),
      );
    }
    default:
      return null;
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ options: OPTIONS, allowPositionals: true });
  const started = performance.now();
  const result = values.help ? null : await run(positionals[0], values);
  if (result === null) {
    console.log(USAGE);
    return;
  }
  const seconds = (performance.now() - started) / 1000;
  console.log(toMarkdown(result));
  console.log(
    `${String(result.summary.rounds)} Runden in ${seconds.toFixed(2)} s (${(result.summary.rounds / seconds).toFixed(0)} Runden/s)`,
  );
  console.log(`Ergebnisse: ${writeResult(result, Number(values.seed))}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
