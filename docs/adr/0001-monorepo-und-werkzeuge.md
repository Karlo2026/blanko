# ADR 0001: Monorepo und Werkzeuge

**Status:** angenommen (Phase 1)

## Kontext

Engine und Bots sollen auf dem Mac (Node) und im Browser identisch laufen. Der Code soll streng
typisiert, getestet und frei von totem Code sein.

## Entscheidungen

- **npm-Workspaces** statt pnpm/Nx/Turborepo: npm ist ohnehin installiert, vier Pakete brauchen
  keine Build-Orchestrierung.
- **Pakete werden als TypeScript-Quelltext konsumiert, ohne eigenen Build-Schritt.** Jedes Paket
  zeigt mit `exports` direkt auf `src/index.ts`. Vite und Vitest verstehen das von sich aus, Node
  ab Version 24 entfernt Typen selbst (Type-Stripping). Deshalb gelten `erasableSyntaxOnly`
  (keine `enum`s, keine Parameter-Properties) und Importe mit `.ts`-Endung.
- **TypeScript 6.0 statt 7.0:** typescript-eslint unterstützt TypeScript 7 noch nicht
  (Peer-Bereich `<6.1`). Wechsel, sobald es das tut.
- **Eine gemeinsame Konfiguration** für TypeScript (`tsconfig.base.json`), ESLint
  (`eslint.config.js`), Prettier und knip im Wurzelverzeichnis. Pakete erben nur.
- **Strenge über den Strict-Modus hinaus:** `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedIndexedAccess`, ESLint mit `strictTypeChecked`.
- Pakete ohne Code (`bots`, `lab` in Phase 1) laufen mit `--passWithNoTests` bzw.
  `--no-error-on-unmatched-pattern`. Die Schalter fallen weg, sobald dort Code liegt.

## Abhängigkeiten und ihre Begründung

| Paket                              | Warum                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| `typescript`                       | Typprüfung im Strict-Modus                                                    |
| `vitest`                           | Testläufer, nutzt dieselbe Vite-Pipeline wie die App und braucht keinen Build |
| `eslint`, `@eslint/js`             | Statische Prüfung                                                             |
| `typescript-eslint`                | typgestützte Regeln (z. B. unbehandelte Promises, unnötige Bedingungen)       |
| `prettier`                         | einheitliche Formatierung ohne Stildiskussion                                 |
| `knip`                             | findet tote Dateien, Exporte und Abhängigkeiten                               |
| `react`, `react-dom`               | Oberfläche der App (vom Auftrag vorgegeben)                                   |
| `vite`, `@vitejs/plugin-react`     | Dev-Server und statischer Build der App                                       |
| `@types/react`, `@types/react-dom` | Typen für React                                                               |

## Bekannte Punkte

`npm audit` meldet eine ReDoS-Lücke in `picomatch`, das Vite, Vitest und typescript-eslint
intern zur Dateisuche nutzen. Es gibt noch keine korrigierte Version. Betroffen sind nur
Entwicklungswerkzeuge, die ausschließlich eigene Glob-Muster verarbeiten; in die ausgelieferte
App gelangt der Code nicht.
