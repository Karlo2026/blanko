# ADR 0004: Simulationslabor

**Status:** angenommen (Phase 4)

## Entscheidungen

- **Kommandozeile ohne Bibliothek:** `node:util` `parseArgs` reicht für zwei Befehle mit wenigen
  Optionen. Node führt die `.ts`-Dateien direkt aus, auch in den Workern.
- **„Partie“ heißt hier eine Runde.** Eine Sitzung ist nur die Summe von Runden; für Statistik
  und Elo zählt jede Runde einzeln. Der Geber wechselt von Runde zu Runde.
- **Reproduzierbarkeit unabhängig von der Worker-Zahl:** Ein Lauf wird in Pakete fester Größe
  (500 Runden) geteilt, jedes mit einem aus dem Lauf-Seed abgeleiteten eigenen Seed. Die
  Ergebnisse werden in Paketreihenfolge zusammengesetzt. Ein Test prüft, dass 1 und 3 Worker
  dasselbe liefern.
- **Elo als Bradley-Terry-Schätzung:** Aus jeder Runde entstehen paarweise Vergleiche (jeder
  Platz schlägt alle schlechter platzierten). Daraus schätzt das MM-Verfahren Stärken auf der
  Elo-Skala (Mittel 1500, 400 Punkte ≙ 10:1). Anders als fortlaufendes Elo hängt das Ergebnis
  nicht von der Reihenfolge der Runden ab. Ein halber virtueller Sieg je Paarung hält die Werte
  endlich.
- **Turnier-Besetzung:** Jede Runde werden die Plätze neu gelost, ohne Wiederholung, solange
  genug Profile da sind.
- **Ergebnisdateien** (`result.json`, `summary.csv`, `report.md`) enthalten keine Laufzeit,
  damit gleicher Seed byte-gleiche Dateien ergibt. Die Laufzeit steht nur in der Konsole.
- **„zufall“** ist ein eingebauter Teilnehmer (Zufalls-Bot) als Nullpunkt der Skala.
