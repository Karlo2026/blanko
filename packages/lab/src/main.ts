// Kommandozeile des Simulationslabors. Aufruf aus dem Wurzelverzeichnis: npm run lab -- <befehl> [optionen]
import { parseArgs } from 'node:util';
import { simulate, tournament, type RunOptions } from './commands.ts';
import { closeWorkers, DEFAULT_WORKERS } from './parallel.ts';
import { availableProfileIds, loadEntrant, saveProfile } from './profile-store.ts';
import { resultFiles, toMarkdown, writeRunFiles } from './report.ts';
import { analyze } from './analyze.ts';
import { analysisFiles } from './analyze-report.ts';
import { buildAppProfiles, writeAppProfiles } from './export.ts';
import { ladderProfiles } from './ladder.ts';
import { tune, type TuneMethod } from './tune.ts';
import { tuneFiles } from './tune-report.ts';

const USAGE = `Blanko-Labor

  npm run lab -- simulate   --seats basis,basis,zufall,zufall [--games 10000] [--seed 1] [--workers N]
  npm run lab -- tournament [--profiles a,b,c] [--players 4] [--games 20000] [--seed 1] [--workers N]
  npm run lab -- tune       --profile basis [--method evolve|random] [--generations 20]
                            [--candidates 8] [--games 4000] [--seed 1] [--save] [--workers N]

Profile liegen in packages/lab/profiles; „zufall“ ist der eingebaute Zufalls-Bot.
Ohne --profiles spielt das Turnier mit allen vorhandenen Profilen.
  npm run lab -- ladder     --profile basis-getunt [--steps 10]
  npm run lab -- analyze    --profile basis-getunt [--games 6000] [--seed 1]
  npm run lab -- export     [--levels leiter-01,leiter-04,leiter-07,leiter-10] [--players 4]
                            [--games 20000] [--seed 1] [--workers N]

tune --save legt das Ergebnis als <profil>-getunt.json in packages/lab/profiles ab.
ladder legt leiter-01 (schwächste) bis leiter-NN (Ausgangsprofil) in packages/lab/profiles ab.
export vermisst alle leiter-* in einem Turnier und schreibt Stufen (Anfänger bis Meister) und
Leiter mit Wertung nach packages/app/public/profiles.json.`;

const OPTIONS = {
  seats: { type: 'string' },
  profiles: { type: 'string' },
  profile: { type: 'string' },
  method: { type: 'string', default: 'evolve' },
  generations: { type: 'string', default: '20' },
  candidates: { type: 'string', default: '8' },
  steps: { type: 'string', default: '10' },
  levels: { type: 'string', default: 'leiter-01,leiter-04,leiter-07,leiter-10' },
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

function runLadder(values: Values): CommandOutput {
  const entrant = loadEntrant(textOf(values, 'profile') ?? '');
  if (entrant.kind !== 'profile') throw new Error('ladder braucht --profile');
  const rungs = ladderProfiles(
    entrant.profile,
    positiveInt(textOf(values, 'steps') ?? '10', 'steps'),
  );
  const paths = rungs.map(saveProfile);
  return {
    text: `Leiter aus ${entrant.id} gespeichert:\n${paths.join('\n')}`,
    files: { 'ladder.json': `${JSON.stringify(rungs, null, 2)}\n` },
  };
}

async function runExport(values: Values): Promise<CommandOutput> {
  const ladder = availableProfileIds()
    .filter((id) => id.startsWith('leiter-'))
    .map(loadEntrant);
  const levelIds = list(textOf(values, 'levels') ?? '');
  const players = positiveInt(textOf(values, 'players') ?? '4', 'players');
  const { profiles, result } = await buildAppProfiles(
    ladder,
    levelIds,
    players,
    runOptions(values, 20_000),
  );
  const levels = profiles.levels.map(
    (l) => `- ${l.label}: ${l.profile.id} (${String(l.profile.rating)})`,
  );
  const path = writeAppProfiles(profiles);
  return {
    text: `${toMarkdown(result)}\nStufen:\n${levels.join('\n')}\n\nGeschrieben: ${path}`,
    files: { ...resultFiles(result), 'profiles.json': `${JSON.stringify(profiles, null, 2)}\n` },
  };
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
    case 'ladder':
      return runLadder(values);
    case 'export':
      return runExport(values);
    case 'analyze': {
      const entrant = loadEntrant(textOf(values, 'profile') ?? '');
      if (entrant.kind !== 'profile') throw new Error('analyze braucht --profile');
      const { games, seed } = runOptions(values, 6000);
      const files = analysisFiles(analyze(entrant.profile, games, seed), entrant.id, seed);
      return { text: files['report.md'] ?? '', files };
    }
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
