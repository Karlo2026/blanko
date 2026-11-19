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
- Die Annahme gilt im Labor gegen Bots; wie gut sie gegen Menschen trägt, ist nicht gemessen.

## Nachtrag: Stufe „Großmeister“ in der App

Der lesende IsmctsBot ist als fünfte Stufe über „Meister“ in der App (`grossmeister`, `reading` 1,
100 Iterationen, höchstens 400 ms pro Entscheidung). Er wird im selben Export-Turnier wie die Leiter
vermessen, gehört aber nicht zur Leiter des dynamischen Modus, weil er langsamer rechnet.

| Stufe       | Elo  | Siegquote im Export-Turnier |
| ----------- | ---- | --------------------------- |
| Anfänger    | 1318 | 5,0 %                       |
| Mittel      | 1423 | 13,3 %                      |
| Stark       | 1530 | 26,4 %                      |
| Meister     | 1652 | 41,8 %                      |
| Großmeister | 1672 | 56,6 %                      |

Neu vermessen am 19.11.2026 nach den Hausregel-Änderungen (Sonderkarten bei jedem offenen Ablegen,
Rundensieg ohne Karten); vorher lagen die Werte zwischen 1337 und 1668.

Im Browser auf dem Mac dauert ein Großmeister-Zug rund 0,8 bis 1 Sekunde (davon 0,75 s bewusste
Pause). Auf dem iPhone begrenzt das Zeitbudget die Rechenzeit; erreicht er dort die 100 Iterationen
nicht in 400 ms, spielt er etwas schwächer als gemessen. Der Labor-Lauf selbst bleibt reproduzierbar,
weil auf dem Mac die Iterationsgrenze vor dem Zeitbudget greift.
