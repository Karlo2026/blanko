# Blanko – Regeln, wie die Engine sie umsetzt

Verbindliche Quelle sind die Hausregeln aus dem Auftrag. Diese Seite fasst zusammen, wie
`packages/engine` sie umsetzt, und listet die festgelegten Annahmen für Grenzfälle.

## Kurzfassung

- 2 bis 6 Spieler, 52 Karten ohne Joker. Ziel: am Rundenende möglichst wenig Punkte.
- Jeder bekommt 4 verdeckte Karten im 2×2-Quadrat und sieht zu Beginn nur die zwei unteren an,
  bis er zum ersten Mal zieht.
- Ein Zug ist genau eines von: **Ziehen** (dann behalten gegen eine eigene Karte oder direkt
  ablegen), **Gleiche Karte ablegen** (Rang der zuvor abgeworfenen Karte), **Klopfen**.
- Die oberste Ablagekarte darf nie genommen werden.
- Sonderkarten wirken bei **jedem offenen Ablegen** (Hausregel-Änderung vom 19.11.2026): frisch
  gezogen und direkt abgelegt, beim Behalten aus der Hand abgelegt oder als gleiche Karte. 8 eigene
  Karte anschauen, 9 gegnerische Karte anschauen, 10 eigene Karte blind mit einer gegnerischen
  tauschen. Die Wirkung ist freiwillig. Keine Wirkung hat eine behaltene 8, 9 oder 10 und eine
  falsch abgelegte, die zurück in die Hand geht.
  Ursprünglich galt: nur frisch gezogen und direkt abgelegt.
- Nach dem Klopfen hat jeder andere Spieler genau noch einen Zug. Die Karten des Klopfers
  bleiben unverändert.
- Falsch abgelegt: Strafkarte vom Nachziehstapel, verdeckt und unbesehen.

## Wertung

- Ass 1, 2 bis 10 Augenzahl, Bube/Dame/König 10. Gleiche Ränge zählen nur einmal.
- Hat der Klopfer nicht allein die niedrigste Punktzahl, wird er Letzter (auch bei Gleichstand).
- Sonstiger Gleichstand: Die Beteiligten ziehen je eine Karte aus einem frisch gemischten Deck,
  die niedrigste gewinnt, bei gleichem Wert wird erneut gezogen.
- Platzierungspunkte: Platz 1 +2, letzter −2, ab 4 Spielern Platz 2 +1 und vorletzter −1.

## Festgelegte Annahmen

Alle Schalter stehen in [`packages/engine/src/rules.ts`](../packages/engine/src/rules.ts).

| Nr. | Annahme                                                                                                                       | Umsetzung                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| A1  | Plätze sind fest; abgelegte Plätze bleiben leer. Strafkarte auf den ersten freien Platz, sonst neue Reihe.                    | `penaltyFillsEmptySlot`                   |
| A2  | Auf die aufgedeckte Startkarte darf keine gleiche Karte gelegt werden.                                                        | `matchOnStartCard`                        |
| A3  | Gleiche Karten bilden eine Kette.                                                                                             | `matchChains`                             |
| A4  | ~~Eine per Gleiche-Karte-Zug abgelegte 8, 9 oder 10 löst nichts aus.~~ Entfallen durch die Hausregel-Änderung vom 19.11.2026. | –                                         |
| A5  | Falsch abgelegte Karte geht verdeckt zurück und ist danach allen bekannt.                                                     | `failedMatchRevealsToAll`                 |
| A6  | Kein 10-Tausch mit dem Klopfer; eine 9 darf seine Karten anschauen.                                                           | `tenSwapWithKnocker`, `ninePeekAtKnocker` |
| A7  | Ein Spieler ohne Karten hat 0 Punkte und spielt weiter.                                                                       | folgt aus Wertung und Zügen               |
| A8  | Beim Neumischen bleibt die oberste Ablagekarte liegen (auch für Strafkarten).                                                 | `reshuffleKeepsTopDiscard`                |
| A9  | Klopfen ist ab dem ersten Zug erlaubt.                                                                                        | `knockFromFirstTurn`                      |
| A10 | Erster Geber zufällig, danach im Uhrzeigersinn.                                                                               | `session.ts`                              |
| A11 | Liefert auch Neumischen keine Karte mehr, endet die Runde sofort; eine fällige Strafkarte entfällt.                           | `turn.ts`                                 |

## Auslegungen

Diese Punkte sind in den Regeln nicht ausdrücklich geregelt. Die Engine legt sie so aus:

- **Gleichstand-Ziehen:** „Niedrigste Karte“ meint den Punktwert. 10, Bube, Dame und König
  haben also denselben Wert, und die Beteiligten ziehen dann erneut.
- **Ansehen der unteren Karten** endet nur mit dem ersten regulären Ziehen, nicht mit einer
  Strafkarte.
- **Gleiche Karte nach Sonderkarte:** Wer eine 8, 9 oder 10 zieht und mit Sonderfunktion
  ablegt, hat abgeworfen. Der nächste Spieler darf also eine gleiche Karte nachlegen.
- **Gleiche Karte auf Verdacht** ist für jede eigene Karte erlaubt. Die Engine prüft nicht, ob
  der Spieler sie kennt; das entscheidet der Bot bzw. der Mensch.
