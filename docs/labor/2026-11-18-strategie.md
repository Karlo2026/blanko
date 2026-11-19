# Erster Strategiebericht (Phase 6)

Datengrundlage: `npm run lab -- analyze --profile basis-getunt --games 15000 --seed 1`, also
15 000 Runden mit dem getunten RuleBot auf allen Plätzen, gleichmäßig 2 bis 6 Spieler. An
zufällig gewählten Entscheidungspunkten werden zwei Alternativen mit denselben Zufallszahlen zu
Ende gespielt (kontrafaktische Partien); verglichen werden die Platzierungspunkte. Alle
Tabellen: [vollständige Auswertung](2026-11-18-analyse-tabellen.md).

Alle Aussagen gelten für Tische mit starken Bots. Gegen schwächere Gegner kann sich manches
verschieben.

## 1. Wann lohnt sich das Klopfen?

Verglichen wird „jetzt klopfen“ mit „ziehen und normal weiterspielen“. Die Schätzung ist die
eigene Handpunktzahl, wie der Bot sie sieht (unbekannte eigene Karten mit Erwartungswert, etwa 6).

| Spieler | 2.–3. Tischrunde | 4.–6. Tischrunde |
| ------- | ---------------- | ---------------- |
| 2       | bis etwa 15      | bis etwa 9       |
| 3       | –                | bis etwa 5       |
| 4       | bis etwa 9       | bis etwa 5       |
| 5–6     | –                | –                |

- **Je mehr Spieler, desto niedriger muss die Hand sein.** Bei 5 bis 6 Spielern lohnt sich Klopfen
  fast nie: Es reicht, dass einer von vielen Gegnern gleich gut oder besser ist.
- **In der ersten Tischrunde nie klopfen.** Man kennt zu wenig, und der Klopfer wird bei
  Gleichstand Letzter.
- **Spät in der Runde wird Klopfen riskanter**, weil die Gegner ihre Hände inzwischen verbessert
  haben. Wer spät noch nicht geklopft hat, sitzt meist gegen starke Hände.
- Die feste Klopf-Grenze des getunten Bots (rund 4 bis 7 Punkte, bei 2 Spielern 7,5) passt dazu.

## 2. Wann lohnt sich der 10-Tausch, und mit wem?

> Stand vor der Hausregel-Änderung vom 19.11.2026 (Sonderkarten wirken seitdem bei jedem offenen
> Ablegen). Die Aussagen zum 10-Tausch selbst bleiben gültig; neu messen mit `npm run lab -- analyze`.

„Tauschen“ minus „die 10 einfach ablegen“, für Tausche gegen eine verdeckte Gegnerkarte:

| eigene Karte | Ziel führt | Ziel führt nicht |
| ------------ | ---------- | ---------------- |
| 1–3          | −0,40      | −0,35            |
| 4–6          | +0,01      | −0,04            |
| 7–9          | +0,29      | +0,19            |
| 10, Bilder   | +0,31      | +0,41            |

- **Nur eine bekannte hohe Karte (7 bis 10 Punkte) weggeben.** Eine niedrige wegzutauschen schadet
  deutlich; bei mittleren Karten ist es egal.
- **Bekannte niedrige Gegnerkarten** sind das beste Ziel (+0,42 für eine eigene 4–6 gegen eine
  bekannte 1–3), kommen aber selten vor.
- **Ob das Ziel führt, macht wenig Unterschied.** Der Effekt auf die eigene Hand überwiegt.

## 3. Wie viel bringen Paare gleichen Rangs?

- In den Endhänden spart ein Paar im Schnitt **3,6 Punkte je Hand**.
- Hände mit Paar holen **+0,13** Platzierungspunkte, Hände ohne **−0,26**.
- Zwei Drittel aller Endhände enthalten ein Paar: Eine gezogene Karte gleichen Rangs zu behalten
  kostet keinen Punkt, und der Bot nutzt das.

## 4. Wann lohnt sich das Ablegen auf Verdacht?

| Trefferchance | unbekannte Karte ablegen statt normaler Wahl |
| ------------- | -------------------------------------------- |
| unter 5 %     | −0,66                                        |
| 5–10 %        | −0,61                                        |
| 10–20 %       | −0,67                                        |
| über 20 %     | −0,60 (nur 67 Fälle)                         |

**Nie.** Selbst bei guter Chance kostet es im Mittel über einen halben Platzierungspunkt: Die
Strafkarte ist unbekannt und meist teurer als der mögliche Gewinn, und die abgelegte Karte ist
danach allen bekannt. Der getunte Bot legt folgerichtig nie auf Verdacht ab.

## Schwierigkeitsstufen

Aus `basis-getunt` entsteht mit `npm run lab -- ladder --profile basis-getunt` eine Leiter von 10
Profilen. Schwächere Sprossen machen mehr plausible Fehlgriffe (bis 60 % der Entscheidungen),
vergessen etwas (bis 3 % je Karte und Zug), behalten gröber und klopfen waghalsiger.
`npm run lab -- export --seed 2` vermisst die Leiter im Turnier (4 Spieler, 20 000 Runden) und
schreibt sie nach `packages/app/public/profiles.json`:

| Stufe    | Profil    | Elo  |
| -------- | --------- | ---- |
| Anfänger | leiter-01 | 1346 |
| Mittel   | leiter-04 | 1439 |
| Stark    | leiter-07 | 1556 |
| Meister  | leiter-10 | 1675 |

Die Stufen sind klar abgestuft (95 bis 120 Elo Abstand). Seit Phase 9 gibt es darüber den
„Großmeister“ (IsmctsBot, der Gegner liest); mit ihm wurde neu exportiert, die Werte stehen in
[ADR 0008](../adr/0008-gegner-lesen.md). Alle zehn Sprossen der Leiter steigen
streng an und dienen dem dynamischen Modus (Phase 8).

### Was dabei aufgefallen ist

- **Zufällige Fehlzüge waren meist Strafkarten.** Weil es bis zu vier „gleiche Karte ablegen“-
  Varianten gibt, legten schwache Bots ständig auf Verdacht ab (Ø 51 Handpunkte, 152 Züge je
  Runde). Fehler sind jetzt plausible Fehlgriffe ohne Klopfen und ohne Verdachtsablage.
- **Starkes Vergessen lähmt das Klopfen.** Vergessene Karten schätzt der RuleBot wie unbekannte und
  erreicht seine Klopf-Grenze nicht mehr. Deshalb vergessen auch schwache Stufen nur wenig.
