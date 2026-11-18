# Gegner lesen (Phase 9)

IsmctsBot mit 100 Iterationen und `basis-getunt` als Rollout-Strategie, mit und ohne Lesen.

## Gegen den getunten RuleBot

Ein IsmctsBot gegen lauter `basis-getunt`, 4000 Runden, 2 bis 6 Spieler, Sitz rotiert, Seed 13 für
alle Varianten (gleiche Austeilungen):

| `reading` | Ø Platzierungspunkte |
| --------- | -------------------- |
| 0 (ohne)  | −0,019 ± 0,027       |
| 0,5       | +0,100 ± 0,027       |
| 0,8       | +0,104 ± 0,026       |
| 1,0       | **+0,168 ± 0,026**   |

Volles Lesen ist am stärksten: Gegen Bots, die rational behalten, stimmt die Annahme fast immer.

## Turnier gegen die bisherigen Bots

```bash
npm run lab -- tournament --profiles ismcts-lesen,ismcts,basis-getunt,basis --players 4 --games 3000 --seed 21
```

| Profil       | Siegquote | Ø Platzierung | Klopferfolg | Elo  |
| ------------ | --------- | ------------- | ----------- | ---- |
| ismcts-lesen | 27,7 %    | +0,170        | 73,2 %      | 1521 |
| ismcts       | 29,6 %    | +0,088        | 67,3 %      | 1511 |
| basis-getunt | 19,8 %    | +0,032        | 78,3 %      | 1503 |
| basis        | 23,0 %    | −0,290        | 52,3 %      | 1465 |

`ismcts-lesen` gewinnt das Turnier. Die Elo-Abstände sind klein, weil sich starke Bots am selben Tisch
gegenseitig Plätze wegnehmen und die Wertung nur die Reihenfolge zählt; in Platzierungspunkten ist
der Vorsprung deutlicher. Laufzeit: rund 22 Minuten auf allen Kernen.

## Einordnung

Der Zugewinn kommt aus besserem Wissen, nicht aus mehr Rechenzeit: Ohne Lesen war der IsmctsBot
nur so stark wie seine Faustregeln (Phase 5). Mit Lesen weiß er, dass eine behaltene Karte meist
niedrig ist – das macht vor allem Klopfen gegen Gegner, die gerade behalten haben, riskanter und
10-Tausche gezielter.
