# ADR 0002: Aufbau der Engine

**Status:** angenommen (Phase 2)

## Entscheidungen

- **Reducer-Muster:** `applyAction(state, action, rng)` liefert `{ state, events }` und verändert
  nichts. Zufall kommt ausschließlich aus dem übergebenen, geseedeten `Rng`. Der `Rng` selbst
  hat inneren Zustand; das ist der bewusste Kompromiss zugunsten der Geschwindigkeit im Labor.
- **Prüfung über `legalActions`:** `applyAction` lehnt alles ab, was nicht in `legalActions`
  steht. So gibt es genau eine Stelle, die festlegt, was erlaubt ist.
- **Sonderkarten als eigene Aktionen** (`peekOwn`, `peekOpponent`, `blindSwap`) statt einer
  Zwischenphase: Ablegen und Wirkung sind ein einziger Schritt. Das hält die Zustandsmaschine bei
  drei Phasen (`turnStart`, `drawn`, `roundOver`).
- **Wissen hängt an der Karten-ID** und ist als Bitmaske pro Karte gespeichert. Bei Tauschen
  (Behalten, 10) wandert es dadurch automatisch mit. Neu gemischte Karten vergisst jeder.
- **Die Engine speichert perfektes Gedächtnis.** Vergessen ist Sache der Bots (Profil
  `forgetRate`). Die Oberfläche zeigt eigene Karten nur offen, solange `canStillPeek` gilt.
- **`PlayerView` verrät verdeckte Karten nicht einmal über ihre ID**, weil die IDs fest einer
  Karte zugeordnet sind. Verdeckte Plätze erscheinen nur als `{ kind: 'hidden' }`.
- **Ereignisse enthalten nur öffentliche Information** und dürfen daher an alle Spieler gehen.
- **Regelannahmen stehen gesammelt in `rules.ts`** (siehe [Regeln](../regeln.md)).

## Geprüft durch

Jede Regel, Wertungsregel und Annahme hat mindestens einen Test. Dazu kommen Partien mit
Zufallszügen über 1000 Seeds (2 bis 6 Spieler) und lange Runden mit mehrfachem Neumischen. Nach
jedem Zug wird geprüft, dass keine Karte verloren geht oder doppelt vorkommt.
