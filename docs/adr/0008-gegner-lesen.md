# ADR 0008: Gegner lesen

**Status:** angenommen (Phase 9)

## Entscheidungen

- **Öffentliche Herkunft in der Engine:** Behält ein Spieler eine gezogene Karte, sehen alle, welche
  Karte er dafür offen abwirft. Die Engine speichert das je Karten-ID (`keptOver`) und zeigt es in
  der Sicht bei verdeckten Plätzen an (`{ kind: 'hidden', keptOver }`). Weil es an der Karte hängt,
  wandert es beim 10-Tausch mit; beim Ziehen und bei Strafkarten wird es zurückgesetzt, damit keine
  veraltete Beobachtung an einer neu gemischten Karte hängt.
- **Gewichtete Determinisierung:** `determinize(view, rng, opponentSelfKnowledge, reading)` belegt
  Plätze mit Herkunft zuerst. Karten bis zum Punktwert der abgeworfenen haben Gewicht 1, höhere
  Gewicht 1 − `reading`. Bei 0 ist die Verteilung gleichmäßig wie vorher.
- **Parameter im Profil:** `reading` (0 bis 1) gilt für IsmctsBot-Profile und ist optional
  (Standard 0), damit bestehende Profile gültig bleiben.

## Gemessen

Siehe [Labor-Bericht](../labor/2026-11-18-gegner-lesen.md). Kurz: Mit `reading` 1 schlägt der
IsmctsBot den getunten RuleBot deutlich (+0,17 Platzierungspunkte) und gewinnt das Turnier gegen alle
bisherigen Bots. Damit ist das Ziel aus Phase 5 („deutlich stärker als der beste RuleBot“) im
Nachhinein erreicht – nicht durch mehr Suche, sondern durch besseres Wissen über die Gegner.

## Grenzen

- Die Annahme „behaltene Karte ≤ abgeworfene“ stimmt gegen rationale Bots fast immer. Menschen
  behalten manchmal höhere Karten, etwa für ein Paar; gegen sie könnte ein kleineres `reading`
  besser sein.
- Gelesen wird nur das Behalten. Weitere Signale (wer früh klopft, wer eine 8 nutzt) sind möglich.
- Die App nutzt weiterhin den RuleBot als „Meister“: Der IsmctsBot braucht pro Zug Hunderte
  Simulationen und wäre auf dem iPhone deutlich langsamer.
