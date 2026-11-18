# Erstes Turnier (Phase 4)

```bash
npm run lab -- tournament --profiles basis,vergesslich,waghalsig,anfaenger,zufall --games 40000 --seed 7
```

4 Spieler je Tisch, Besetzung jede Runde neu gelost, 40 000 Runden, Ø 25,5 Züge pro Runde.

| Profil      | Siegquote | Ø Platzierung | Ø Handpunkte | Klopfen | Klopferfolg | Elo  |
| ----------- | --------- | ------------- | ------------ | ------- | ----------- | ---- |
| basis       | 62,5 %    | +1,350        | 12,25        | 8137    | 95,6 %      | 1755 |
| vergesslich | 25,0 %    | +0,656        | 17,37        | 189     | 91,0 %      | 1614 |
| waghalsig   | 19,8 %    | −0,098        | 21,20        | 5677    | 45,5 %      | 1501 |
| anfaenger   | 11,3 %    | −0,225        | 24,80        | 18      | 38,9 %      | 1482 |
| zufall      | 6,3 %     | −1,682        | 33,97        | 25847   | 7,8 %       | 1147 |

Mit 1 Worker und mit allen Kernen sind die Ergebnisdateien byte-gleich. Durchsatz auf dem Mac:
rund 20 000 Runden/s mit allen Kernen, 5 500 mit einem.

## Beobachtungen

- **Vergessen unterdrückt das Klopfen fast völlig.** Vergessene Karten schätzt der RuleBot mit
  dem Erwartungswert, sodass er seine Klopf-Grenze kaum noch erreicht. „vergesslich“ klopft 40-mal
  seltener als „basis“, „anfaenger“ praktisch nie. Menschen klopfen auch mit vagem Gedächtnis;
  der RuleBot sollte vergessene Karten daher vermutlich besser schätzen als eine völlig unbekannte.
  Das wird mit `tune` und den Stufen in Phase 6 wichtig.
- **Frühes Klopfen lohnt sich nicht:** „waghalsig“ (Klopf-Grenze 11 bis 14) gewinnt nur 45 % seiner
  Klopfer und landet knapp unter dem Mittel.
