# Blanko

App für das Kartenspiel „Blanko“: allein gegen Computergegner oder online mit Freunden an einem
Tisch, freie Plätze füllen Bots.

- **Labor (Mac, Node):** Bots spielen tausende Partien gegeneinander, um Strategien zu finden und
  Schwierigkeitsstufen zu erzeugen und zu vermessen.
- **App (iPhone, PWA):** Spiel gegen 1 bis 5 Bots mit festen Stufen und einem dynamischen Modus,
  dazu „Online spielen“ über einen Raum-Link.
- **Server (Node):** Mehrspieler-Räume über WebSocket; nur er kennt das ganze Spiel.

Alle nutzen dieselbe Engine und dieselben Bots.

## Stand

- Phase 10 „Online-Mehrspieler“: Freunde spielen über einen Raum-Link `…/?raum=CODE` an einem
  Tisch, freie Plätze füllen Bots. Wer länger als eine Minute weg ist, während er am Zug ist, wird
  von einem Bot vertreten. Server in `packages/server`, Nachrichten in `packages/protocol`
  ([ADR 0009](docs/adr/0009-mehrspieler.md)). Der Einzelspielermodus bleibt unverändert und offline
  nutzbar.
- Alle 9 Phasen sind abgeschlossen. Phase 9 „Gegner lesen“ macht den IsmctsBot zum stärksten Bot;
  in der App spielt er als fünfte Stufe „Großmeister“ ([ADR 0008](docs/adr/0008-gegner-lesen.md)).
- Phase 1 bis 8: die iPhone-App ist spielbar und offline nutzbar
  ([ADR 0006](docs/adr/0006-app.md)), mit dynamischem Modus und Spielerwertung
  ([ADR 0007](docs/adr/0007-dynamischer-modus.md)).
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
| `npm run server`       | Mehrspieler-Server lokal auf Port 10000                 |

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

**Veröffentlicht unter https://karlo2026.github.io/blanko/** – jeder Push auf `main` testet, baut
und veröffentlicht neu (`.github/workflows/pages.yml`).

1. Bauen: `npm run build -w @blanko/app`. Das Ergebnis liegt in `packages/app/dist/`.
2. Den Ordner `dist/` als statische Seite hosten, etwa über GitHub Pages. Alle Pfade sind relativ,
   ein Unterpfad wie `/blanko/` funktioniert also.
3. Auf dem iPhone die Seite in Safari öffnen, Teilen → „Zum Home-Bildschirm“.
4. Einmal öffnen, solange Netz da ist; danach läuft die App offline.

Zum Ausprobieren am Mac: `npm run dev -w @blanko/app` (Entwicklung) oder
`npm run build -w @blanko/app && npm run preview -w @blanko/app` (mit Service Worker).

## Mehrspieler-Server

`npm run server` startet den Server lokal auf Port 10000 (oder `PORT`). Er antwortet auf
`GET /health` mit `ok` und nimmt WebSocket-Verbindungen nur von `https://karlo2026.github.io` und
`localhost` an. Räume liegen im Speicher; ein Neustart verliert sie.

Mit zwei Browser-Tabs testen:

1. Server starten: `npm run server`
2. In einem zweiten Terminal die App mit Server-Adresse starten:
   `VITE_SERVER_URL=ws://localhost:10000 npm run dev -w @blanko/app`
3. Tab 1: http://localhost:5173 → „Online spielen“, Namen eingeben, „Raum erstellen“.
4. „Link teilen“ kopiert den Einladungslink (…/?raum=CODE). In Tab 2 öffnen, anderen Namen
   eingeben, „Beitreten“.
5. In Tab 1 Bots dazusetzen, Stufe wählen, „Spiel starten“. Jeder Tab sieht nur die eigenen
   Karten; den Tisch sieht jeder von seinem Platz aus.
6. Einen Tab schließen: Der andere zeigt „ist offline“. Wieder öffnen, „Online spielen“ →
   „Zurück an den Tisch“ setzt auf denselben Platz.

Beide Tabs teilen sich den Browser-Speicher; „Zurück an den Tisch“ kennt daher nur den zuletzt
betretenen Platz. Für zwei ganz getrennte Spieler ein privates Fenster nehmen.

Ohne `VITE_SERVER_URL` gibt es kein „Online spielen“; der Einzelspielermodus bleibt unverändert
und offline nutzbar.

### Auf Render veröffentlichen

1. Auf render.com „New → Web Service“ und dieses Repository verbinden.
2. Einstellungen:

   | Feld          | Wert                               |
   | ------------- | ---------------------------------- |
   | Runtime       | Node                               |
   | Build-Befehl  | `npm ci`                           |
   | Start-Befehl  | `node packages/server/src/main.ts` |
   | Health Check  | `/health`                          |
   | Instance Type | Free                               |

   Die Node-Version (≥ 24) kommt aus `engines` in der `package.json`; sonst die Umgebungsvariable
   `NODE_VERSION=24` setzen. `PORT` setzt Render selbst.

3. Die Adresse des Dienstes als Repository-Variable `BLANKO_SERVER_URL` eintragen, etwa
   `wss://blanko-xxxx.onrender.com`. Das geht unter GitHub → Settings → Secrets and variables →
   Actions → Variables.
4. Den Workflow „App veröffentlichen“ neu starten. Danach zeigt die App „Online spielen“.

Der Gratis-Plan schläft nach 15 Minuten ohne Verbindung. Das erste Verbinden weckt ihn, das dauert
bis zu einer Minute, und die App zeigt solange „Server wird geweckt …“.

## Aufbau

```
blanko/
├─ packages/
│  ├─ engine/   Regeln, Spielzustand, Wertung – keine Abhängigkeiten, nur reine Funktionen
│  ├─ bots/     Bot-Schnittstelle, Wissensmodell, RuleBot, IsmctsBot, Bot-Profile
│  ├─ protocol/ Nachrichten zwischen App und Server samt Prüfung
│  ├─ lab/      Kommandozeilen-Werkzeug zum Simulieren auf dem Mac (Node)
│  ├─ server/   Mehrspieler-Server: Räume, WebSocket, Bot-Worker (Node)
│  └─ app/      PWA fürs iPhone (Vite + React)
└─ docs/        Regeln, Architekturentscheidungen, Ergebnisse aus dem Labor
```

Abhängigkeiten zeigen nur nach innen: `app → bots → engine`, `lab → bots → engine` und
`server → protocol → bots → engine`; die App nutzt `protocol` für den Online-Modus.
Architekturentscheidungen stehen in [`docs/adr/`](docs/adr/).
