# ADR 0007: Dynamischer Modus

**Status:** angenommen (Phase 8)

## Entscheidungen

- **Eine Spielerwertung für alle Modi.** Die App führt eine Elo-Wertung des Menschen auf derselben
  Skala wie die im Labor gemessenen Bot-Wertungen. Sie wird nach jeder Runde fortgeschrieben, auch
  bei fester Stufe, denn auch die Stufen haben gemessene Wertungen. Gespeichert wird sie lokal.
- **Paarweise Anpassung:** Jeder Gegner ist ein Zweikampf, gewonnen, wenn der Mensch vor ihm
  landet. Der Faktor (40 je Runde, in den ersten 10 Runden 80) wird auf die Gegner verteilt, damit
  eine Runde zu sechst nicht stärker zählt als zu zweit.
- **Gegnerwahl:** Für jedes Leiter-Profil werden die erwarteten Platzierungspunkte gegen einen Tisch
  aus lauter Gegnern dieser Wertung berechnet (unabhängige Zweikämpfe, Binomialverteilung über die
  Plätze). Gewählt wird das Profil mit dem Erwartungswert am nächsten an 0. Bei gleichen Gegnern ist
  das die Sprosse mit der nächstliegenden Wertung; die Rechnung macht die Vorgabe „im Schnitt etwa
  0 Platzierungspunkte“ aber ausdrücklich und prüfbar.
- **Startwert:** die Wertung der Stufe „Mittel“. Die rechnerische Mitte der Leiter liegt näher an
  „Stark“ und wäre für Neulinge zu hoch.
- **Anzeige:** Stärke in der Kopfzeile, auf der Startseite mit nächstliegender Stufe („etwa
  Mittel“), am Rundenende mit Veränderung und der Stärke der nächsten Gegner.

## Grenzen

Die Leiter reicht von rund 1350 bis 1680. Wer darunter oder darüber liegt, bekommt die schwächste
bzw. stärkste Sprosse; die Erwartung ist dann nicht mehr 0.
