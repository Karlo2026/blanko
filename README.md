# Blanko

App für das Kartenspiel „Blanko“: ein Mensch spielt allein gegen Computergegner.

- **Labor (Mac, Node):** Bots spielen tausende Partien gegeneinander, um Strategien zu finden und
  Schwierigkeitsstufen zu erzeugen und zu vermessen.
- **App (iPhone, PWA):** Spiel gegen 1 bis 5 Bots mit vier festen Stufen und einem dynamischen Modus.

Beide nutzen dieselbe Engine und dieselben Bots.

## Stand

Phase 1 (Grundgerüst) ist abgeschlossen. Die Engine enthält bisher nur den Zufallsgenerator mit
Seed; `bots` und `lab` sind noch leer.

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

Nur für die App (`-w @blanko/app`):

| Befehl                           | Wirkung                       |
| -------------------------------- | ----------------------------- |
| `npm run dev -w @blanko/app`     | Entwicklungsserver mit Vite   |
| `npm run build -w @blanko/app`   | statischer Build nach `dist/` |
| `npm run preview -w @blanko/app` | Build lokal ansehen           |

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
