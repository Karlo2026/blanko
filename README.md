# Blanko

App für das Kartenspiel „Blanko“: ein Mensch spielt allein gegen Computergegner.

- **Labor (Mac, Node):** Bots spielen tausende Partien gegeneinander, um Strategien zu finden und
  Schwierigkeitsstufen zu erzeugen und zu vermessen.
- **App (iPhone, PWA):** Spiel gegen 1 bis 5 Bots mit vier festen Stufen und einem dynamischen Modus.

Beide nutzen dieselbe Engine und dieselben Bots.

## Stand

- Phase 1 bis 7 sind abgeschlossen; die iPhone-App ist spielbar und offline nutzbar
  ([ADR 0006](docs/adr/0006-app.md)).
- Phase 1 bis 6 im Einzelnen: Der IsmctsBot ist gleich stark wie der getunte RuleBot, aber
  nicht deutlich stärker ([ADR 0005](docs/adr/0005-ismcts-bot.md)).
- Die vier Stufen und die Leiter für den dynamischen Modus liegen vermessen in
  `packages/app/public/profiles.json`; dazu gibt es einen ersten
  [Strategiebericht](docs/labor/2026-11-18-strategie.md).
- Die Engine setzt alle Regeln, die Wertung und die Sicht pro Spieler um, siehe
  [Regeln](docs/regeln.md).
- `bots` enthält Bot-Schnittstelle, Gedächtnis mit Vergessen, RuleBot, Zufalls-Bot,
  Profilformat und den Runner `playRound` ([ADR 0003](docs/adr/0003-bots.md)).
- `lab` simuliert Partien und spielt Turniere mit Elo-Wertung ([ADR 0004](docs/adr/0004-labor.md),
  [erstes Turnier](docs/labor/2026-11-18-erstes-turnier.md)).

## Engine in Kürze

```ts
import {
  applyAction,
  createRng,
  getPlayerView,
  legalActions,
  scoreRound,
  startRound,
} from '@blanko/engine';

const rng = createRng(42);
let state = startRound({ playerCount: 3, dealer: 0 }, rng);
while (state.phase.kind !== 'roundOver') {
  const view = getPlayerView(state, state.current); // nur das, was dieser Spieler wissen darf
  const action = legalActions(state)[0]; // hier entscheidet später ein Bot
  state = applyAction(state, action, rng).state;
}
const { ranking, placementPoints } = scoreRound(state, rng);
```

## Voraussetzungen

- Node.js ≥ 24 (das Labor startet `.ts`-Dateien direkt über Nodes eingebautes Type-Stripping)
- npm ≥ 10

## Start

```bash
npm install
npm run check
```

## Befehle

Im Wurzelverzeichnis, jeweils für alle Pakete:

| Befehl                 | Wirkung                                                 |
| ---------------------- | ------------------------------------------------------- |
| `npm test`             | Vitest in allen Paketen                                 |
| `npm run lint`         | ESLint (typgeprüfte, strenge Regeln) in allen Paketen   |
| `npm run typecheck`    | `tsc` im Strict-Modus in allen Paketen mit Code         |
| `npm run knip`         | findet ungenutzte Dateien, Exporte und Abhängigkeiten   |
| `npm run format`       | formatiert alles mit Prettier                           |
| `npm run format:check` | prüft die Formatierung                                  |
| `npm run check`        | alles oben Genannte nacheinander, Abschluss jeder Phase |

Labor (Ergebnisse als JSON, CSV und Markdown in `packages/lab/results/`):

| Befehl                                                        | Wirkung                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm run lab -- simulate --seats basis,basis,zufall,zufall`   | feste Besetzung, Statistik je Profil                          |
| `npm run lab -- tournament --profiles basis,anfaenger,zufall` | wechselnde Besetzung, Elo je Profil                           |
| `npm run lab -- tune --profile basis --save`                  | sucht bessere Parameter per Selbstspiel                       |
| `npm run lab -- --help`                                       | alle Optionen (`--games`, `--seed`, `--players`, `--workers`) |

Profile liegen als JSON in `packages/lab/profiles/`, `zufall` ist der eingebaute Zufalls-Bot.
Gleicher Seed ergibt gleiche Ergebnisse, unabhängig von der Zahl der Worker.

Nur für die App (`-w @blanko/app`):

| Befehl                           | Wirkung                       |
| -------------------------------- | ----------------------------- |
| `npm run dev -w @blanko/app`     | Entwicklungsserver mit Vite   |
| `npm run build -w @blanko/app`   | statischer Build nach `dist/` |
| `npm run preview -w @blanko/app` | Build lokal ansehen           |

## App aufs iPhone

1. Bauen: `npm run build -w @blanko/app`. Das Ergebnis liegt in `packages/app/dist/`.
2. Den Ordner `dist/` als statische Seite hosten, etwa über GitHub Pages. Alle Pfade sind relativ,
   ein Unterpfad wie `/blanko/` funktioniert also.
3. Auf dem iPhone die Seite in Safari öffnen, Teilen → „Zum Home-Bildschirm“.
4. Einmal öffnen, solange Netz da ist; danach läuft die App offline.

Zum Ausprobieren am Mac: `npm run dev -w @blanko/app` (Entwicklung) oder
`npm run build -w @blanko/app && npm run preview -w @blanko/app` (mit Service Worker).

## Aufbau

```
blanko/
├─ packages/
│  ├─ engine/   Regeln, Spielzustand, Wertung – keine Abhängigkeiten, nur reine Funktionen
│  ├─ bots/     Bot-Schnittstelle, Wissensmodell, RuleBot, IsmctsBot, Bot-Profile
│  ├─ lab/      Kommandozeilen-Werkzeug zum Simulieren auf dem Mac (Node)
│  └─ app/      PWA fürs iPhone (Vite + React)
└─ docs/        Regeln, Architekturentscheidungen, Ergebnisse aus dem Labor
```

Abhängigkeiten zeigen nur nach innen: `app → bots → engine` und `lab → bots → engine`.
Architekturentscheidungen stehen in [`docs/adr/`](docs/adr/).
