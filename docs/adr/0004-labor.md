# ADR 0004: Simulationslabor

**Status:** angenommen (Phase 4)

## Entscheidungen

- **Kommandozeile ohne Bibliothek:** `node:util` `parseArgs` reicht für zwei Befehle mit wenigen
  Optionen. Node führt die `.ts`-Dateien direkt aus, auch in den Workern.
- **„Partie“ heißt hier eine Runde.** Eine Sitzung ist nur die Summe von Runden; für Statistik
  und Elo zählt jede Runde einzeln. Der Geber wechselt von Runde zu Runde.
- **Reproduzierbarkeit unabhängig von der Worker-Zahl:** Ein Lauf wird in Pakete fester Größe
  (100 Runden) geteilt, jedes mit einem aus dem Lauf-Seed abgeleiteten eigenen Seed. Die
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

## Nachtrag: tune

- **Champion gegen Herausforderer:** Kandidaten (zufällig oder als Mutation) spielen auf
  denselben Seeds gegen den Champion, über 2 bis 6 Spieler gemittelt. Der Beste muss sich auf
  frischen Seeds signifikant bestätigen (2 Standardfehler), sonst bleibt der Champion.
- **Dauerhafter Worker-Pool:** Worker bleiben zwischen Messungen bestehen und werden am Ende des
  Befehls beendet.

## Nachtrag: ladder, export, analyze (Phase 6)

- **Leiter statt einzeln getunter Stufen:** Alle Stufen entstehen aus einem starken Profil, das
  schrittweise geschwächt wird (Fehlgriffe, Vergessen, gröberes Behalten, waghalsigeres Klopfen).
  So liegen Stufen und Leiter auf einer gemeinsamen Elo-Skala; die Stufen sind Sprossen der Leiter.
- **Export vermisst selbst:** `export` spielt ein eigenes Turnier, damit die Wertungen in
  `profiles.json` immer zu den exportierten Profilen passen. Die Datei enthält keinen Zeitstempel.
- **Analyse mit kontrafaktischen Partien:** An zufällig gewählten Entscheidungspunkten werden zwei
  Alternativen mit denselben Zufallszahlen zu Ende gespielt. Die Analyse läuft einfädig; 15 000
  Runden dauern gut eine Minute.
