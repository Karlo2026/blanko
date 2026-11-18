# ADR 0005: IsmctsBot

**Status:** abgeschlossen (Phase 5). Ziel „deutlich stärker als der beste RuleBot“ in Phase 5 nicht
erreicht, mit Gegner lesen in Phase 9 dann doch (siehe [ADR 0008](0008-gegner-lesen.md)).

## Ergebnis

Gegen den ursprünglichen RuleBot war der IsmctsBot messbar stärker (+0,13). Nach dem Tuning der
Faustregeln (Phase 6, vorgezogen) ist er gleich stark wie der getunte RuleBot (−0,02 ± 0,03):
Eine flache Suche mit Faustregel-Rollouts ist im Kern ein Verbesserungsschritt über diese
Faustregeln, und `tune` holt denselben Gewinn direkt heraus. Für die App ist deshalb der getunte
RuleBot die stärkste Stufe – gleich stark, aber um Größenordnungen schneller. Der IsmctsBot bleibt
im Code als Grundlage für Phase 9 (Gegner lesen) und eine mögliche tiefere Suche.

## Entscheidungen

- **`determinize(view, rng, opponentSelfKnowledge)` liegt in der Engine**, weil das Erzeugen eines
  vollständigen Zustands aus einer Sicht Spiellogik ist. Ein Test stellt sicher, dass der Spieler
  den erzeugten Zustand nicht vom echten unterscheiden kann.
- **Flach an der Wurzel:** Vor jedem Zug werden viele Determinisierungen erzeugt; jede eigene
  Kandidatenaktion wird darin mit RuleBot-Faustregeln bis zum Rundenende gespielt und nach
  Platzierungspunkten bewertet. Spätere Entscheidungen übernimmt der Rollout.
- **Gemeinsame Zufallszahlen:** Alle Kandidaten werden in derselben Determinisierung mit demselben
  Rollout-Seed bewertet. Ohne das wählte der Bot bei 50 Iterationen oft riskante Verdachtsablagen
  und lag klar unter dem RuleBot (−1,29).
- **Abweichen nur bei signifikantem Vorteil:** Der Bot übernimmt die Wahl der Faustregeln, außer
  ein Kandidat ist im gepaarten Vergleich mehr als zwei Standardfehler besser. Ohne diese Hürde wich
  er in 30 % der Entscheidungen ab, ohne dadurch besser zu werden („Fluch des Gewinners“).
- **Kandidaten:** alle gewöhnlichen Aktionen, von den Sonderaktionen nur die Wahl der Faustregeln.
- **Gegnermodell:** Gegner kennen in Determinisierungen alle eigenen Karten. 0 %, 50 % und 100 %
  lagen gemessen innerhalb des Rauschens; 100 % war am besten und ist am einfachsten.
- **Rollouts enden nach 100 Zügen**; `playRound` hat dafür ein Zuglimit. Das Labor nutzt 1000 Züge
  als Schutz gegen Profile, die nie klopfen, und zählt solche Runden als abgebrochen.
- **Zeitbudget** (`timeBudgetMs`) für die App; das Labor nutzt nur Iterationen, damit Läufe
  reproduzierbar bleiben.

## Messwerte

Siehe [Labor-Bericht](../labor/2026-11-18-ismcts.md) und den Nachtrag im
[Tuning-Bericht](../labor/2026-11-18-tune.md).
