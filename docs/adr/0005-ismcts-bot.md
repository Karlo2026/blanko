# ADR 0005: IsmctsBot

**Status:** angenommen (Phase 5, Zwischenstand; gleich stark wie der getunte RuleBot)

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
