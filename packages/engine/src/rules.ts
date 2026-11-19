/**
 * Festgelegte Annahmen für Grenzfälle, die die Hausregeln nicht abdecken.
 *
 * Jede Annahme steht genau hier. Wer eine Regel ändern will, ändert nur diese Datei.
 * Die Nummern entsprechen der Liste „Festgelegte Annahmen“ in docs/regeln.md.
 *
 * Diese Punkte sind keine Schalter, weil sie aus dem Datenmodell folgen, keine sinnvolle
 * Alternative haben oder durch Hausregel-Änderungen des Auftraggebers festgelegt sind:
 * - A4 ist entfallen: Seit der Hausregel-Änderung vom 19.11.2026 wirkt eine 8, 9 oder 10 bei jedem
 *   offenen Ablegen, auch aus der Hand oder per Gleiche-Karte-Zug (siehe `finishDiscard` in turn.ts).
 * - A7 ist ersetzt: Seit der Hausregel vom 19.11.2026 endet die Runde sofort, wenn ein Spieler seine
 *   letzte Karte ablegt; er wird Erster (siehe `endRoundWithEmptyHand` in turn.ts).
 * - A10 (zufälliger erster Geber, danach im Uhrzeigersinn): siehe session.ts.
 * - A11 (liefert auch Neumischen keine Karte mehr, endet die Runde sofort; eine fällige
 *   Strafkarte entfällt): siehe turn.ts und turn-start-moves.ts.
 */
export interface RuleOptions {
  /** A1: Strafkarte füllt den ersten leeren Platz; sonst neue Reihe unter dem Quadrat. */
  readonly penaltyFillsEmptySlot: boolean;
  /** A2: Gleiche Karte darf auf die aufgedeckte Startkarte gelegt werden. */
  readonly matchOnStartCard: boolean;
  /** A3: Ein Gleiche-Karte-Zug eröffnet dem nächsten Spieler erneut einen Gleiche-Karte-Zug. */
  readonly matchChains: boolean;
  /** A5: Eine falsch abgelegte Karte ist danach allen Spielern bekannt. */
  readonly failedMatchRevealsToAll: boolean;
  /** A6: Mit dem Klopfer darf per 10 getauscht werden. */
  readonly tenSwapWithKnocker: boolean;
  /** A6: Eine 9 darf Karten des Klopfers anschauen. */
  readonly ninePeekAtKnocker: boolean;
  /** A8: Beim Neumischen bleibt die oberste Karte des Ablagestapels liegen. */
  readonly reshuffleKeepsTopDiscard: boolean;
  /** A9: Klopfen ist schon im allerersten Zug der Runde erlaubt. */
  readonly knockFromFirstTurn: boolean;
}

export const RULES: RuleOptions = {
  penaltyFillsEmptySlot: true,
  matchOnStartCard: false,
  matchChains: true,
  failedMatchRevealsToAll: true,
  tenSwapWithKnocker: false,
  ninePeekAtKnocker: true,
  reshuffleKeepsTopDiscard: true,
  knockFromFirstTurn: true,
};
