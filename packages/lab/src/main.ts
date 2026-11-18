// Kommandozeile des Simulationslabors. Aufruf aus dem Wurzelverzeichnis: npm run lab -- <befehl> [optionen]
import { parseArgs } from 'node:util';
import { simulate, tournament, type RunOptions } from './commands.ts';
import { closeWorkers, DEFAULT_WORKERS } from './parallel.ts';
import { availableProfileIds, loadEntrant, saveProfile } from './profile-store.ts';
import { resultFiles, toMarkdown, writeRunFiles } from './report.ts';
import { tune, type TuneMethod } from './tune.ts';
import { tuneFiles } from './tune-report.ts';

const USAGE = `Blanko-Labor

  npm run lab -- simulate   --seats basis,basis,zufall,zufall [--games 10000] [--seed 1] [--workers N]
  npm run lab -- tournament [--profiles a,b,c] [--players 4] [--games 20000] [--seed 1] [--workers N]
  npm run lab -- tune       --profile basis [--method evolve|random] [--generations 20]
                            [--candidates 8] [--games 4000] [--seed 1] [--save] [--workers N]

Profile liegen in packages/lab/profiles; „zufall“ ist der eingebaute Zufalls-Bot.
Ohne --profiles spielt das Turnier mit allen vorhandenen Profilen.
tune --save legt das Ergebnis als <profil>-getunt.json in packages/lab/profiles ab.`;

const OPTIONS = {
  seats: { type: 'string' },
  profiles: { type: 'string' },
  profile: { type: 'string' },
  method: { type: 'string', default: 'evolve' },
  generations: { type: 'string', default: '20' },
  candidates: { type: 'string', default: '8' },
  players: { type: 'string', default: '4' },
  games: { type: 'string' },
  seed: { type: 'string', default: '1' },
  workers: { type: 'string', default: String(DEFAULT_WORKERS) },
  save: { type: 'boolean', default: false },
  help: { type: 'boolean', default: false },
} as const;

type Values = Record<string, string | boolean | undefined>;

/** Was ein Befehl hinterlässt: Konsolentext und Dateien für den Ergebnisordner. */
interface CommandOutput {
  readonly text: string;
  readonly files: Readonly<Record<string, string>>;
}

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

function textOf(values: Values, key: string): string | undefined {
  const value = values[key];
  return typeof value === 'string' ? value : undefined;
}

function runOptions(values: Values, defaultGames: number): RunOptions {
  return {
    games: positiveInt(textOf(values, 'games') ?? String(defaultGames), 'games'),
    seed: positiveInt(textOf(values, 'seed') ?? '1', 'seed'),
    workers: positiveInt(textOf(values, 'workers') ?? '1', 'workers'),
  };
}

function tuneMethod(value: string | undefined): TuneMethod {
  if (value === 'random' || value === 'evolve') return value;
  throw new Error(`--method kennt nur random und evolve, nicht „${String(value)}“`);
}

async function runTune(values: Values): Promise<CommandOutput> {
  const entrant = loadEntrant(textOf(values, 'profile') ?? '');
  if (entrant.kind !== 'profile' || entrant.profile.type !== 'rule') {
    throw new Error('tune braucht --profile mit einem RuleBot-Profil');
  }
  const options = {
    ...runOptions(values, 4000),
    method: tuneMethod(textOf(values, 'method')),
    generations: positiveInt(textOf(values, 'generations') ?? '20', 'generations'),
    candidates: positiveInt(textOf(values, 'candidates') ?? '8', 'candidates'),
  };
  const result = await tune(entrant.profile, options);
  const files = tuneFiles(result, options);
  const saved = values.save === true ? `\nProfil gespeichert: ${saveProfile(result.tuned)}` : '';
  return { text: `${files['report.md'] ?? ''}${saved}`, files };
}

async function run(command: string | undefined, values: Values): Promise<CommandOutput | null> {
  switch (command) {
    case 'simulate': {
      const seats = textOf(values, 'seats');
      if (seats === undefined) throw new Error('simulate braucht --seats');
      const result = await simulate(list(seats).map(loadEntrant), runOptions(values, 10_000));
      return { text: toMarkdown(result), files: resultFiles(result) };
    }
    case 'tournament': {
      const ids = list(textOf(values, 'profiles') ?? availableProfileIds().join(','));
      const players = positiveInt(textOf(values, 'players') ?? '4', 'players');
      const result = await tournament(ids.map(loadEntrant), players, runOptions(values, 20_000));
      return { text: toMarkdown(result), files: resultFiles(result) };
    }
    case 'tune':
      return runTune(values);
    default:
      return null;
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({ options: OPTIONS, allowPositionals: true });
  const command = positionals[0];
  const started = performance.now();
  const output = values.help ? null : await run(command, values);
  if (output === null || command === undefined) {
    console.log(USAGE);
    return;
  }
  console.log(output.text);
  console.log(`Dauer: ${((performance.now() - started) / 1000).toFixed(1)} s`);
  console.log(`Ergebnisse: ${writeRunFiles(command, Number(values.seed), output.files)}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeWorkers());
