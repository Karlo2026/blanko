# Labor: analyze (basis-getunt)

15000 Runden, gleichmäßig 2 bis 6 Spieler, Seed 1. Alle Plätze spielen basis-getunt;
an zufällig gewählten Entscheidungspunkten werden zwei Alternativen mit denselben Zufallszahlen
zu Ende gespielt. „·“: weniger als 30 Fälle.

## Ab welcher geschätzten Punktzahl lohnt sich das Klopfen?

Platzierungspunkte „jetzt klopfen“ minus „ziehen und normal weiterspielen“. Positiv: Klopfen lohnt sich.
Schätzung wie der Bot sie sieht (unbekannte Karten mit Erwartungswert).

### Grenze: bis zu welcher Schätzung Klopfen gewinnt

| Spieler | 1. Tischrunde | 2.–3. | 4.–6. | 7.+ |
| ------- | ------------- | ----- | ----- | --- |
| 2       | –             | 14–15 | 8–9   | 4–5 |
| 3       | –             | –     | 4–5   | –   |
| 4       | –             | 8–9   | 4–5   | –   |
| 5       | –             | –     | –     | 0–1 |
| 6       | –             | –     | –     | 0–1 |

### 2 Spieler

| Schätzung | 1. Tischrunde | 2.–3. | 4.–6. | 7.+   |
| --------- | ------------- | ----- | ----- | ----- |
| 0–1       | ·             | ·     | ·     | ·     |
| 2–3       | ·             | ·     | ·     | +0.00 |
| 4–5       | ·             | ·     | +0.09 | +0.18 |
| 6–7       | ·             | ·     | +0.03 | -0.21 |
| 8–9       | ·             | +0.13 | +0.20 | -0.24 |
| 10–11     | ·             | +0.48 | -0.19 | -0.77 |
| 12–13     | ·             | +0.03 | -0.46 | -0.93 |
| 14–15     | ·             | +0.15 | -0.63 | -0.84 |
| 16–17     | -0.84         | -0.44 | -0.83 | -0.98 |
| 18–19     | -0.24         | -0.64 | -1.04 | -1.15 |
| 20+       | -0.82         | -0.80 | -0.96 | -0.89 |

### 3 Spieler

| Schätzung | 1. Tischrunde | 2.–3. | 4.–6. | 7.+   |
| --------- | ------------- | ----- | ----- | ----- |
| 0–1       | ·             | ·     | ·     | -0.02 |
| 2–3       | ·             | ·     | +0.11 | -0.14 |
| 4–5       | ·             | ·     | +0.64 | -0.58 |
| 6–7       | ·             | ·     | -0.04 | -1.20 |
| 8–9       | ·             | -0.27 | -0.67 | -1.45 |
| 10–11     | ·             | -0.26 | -1.05 | -1.26 |
| 12–13     | ·             | -0.71 | -1.36 | -1.43 |
| 14–15     | ·             | -0.86 | -1.47 | -1.45 |
| 16–17     | -0.56         | -0.94 | -1.46 | -1.23 |
| 18–19     | -0.82         | -1.16 | -1.37 | -1.37 |
| 20+       | -1.39         | -1.43 | -1.34 | -0.97 |

### 4 Spieler

| Schätzung | 1. Tischrunde | 2.–3. | 4.–6. | 7.+   |
| --------- | ------------- | ----- | ----- | ----- |
| 0–1       | ·             | ·     | ·     | -1.03 |
| 2–3       | ·             | ·     | -0.17 | -0.30 |
| 4–5       | ·             | ·     | +0.32 | -1.22 |
| 6–7       | ·             | ·     | -0.39 | -1.63 |
| 8–9       | ·             | +0.02 | -1.28 | -1.59 |
| 10–11     | ·             | -0.49 | -1.57 | -1.45 |
| 12–13     | ·             | -1.11 | -1.72 | -1.40 |
| 14–15     | -1.32         | -1.33 | -1.53 | -1.26 |
| 16–17     | -1.08         | -1.50 | -1.55 | -1.24 |
| 18–19     | -1.05         | -1.48 | -1.51 | -1.09 |
| 20+       | -1.60         | -1.55 | -1.35 | -1.22 |

### 5 Spieler

| Schätzung | 1. Tischrunde | 2.–3. | 4.–6. | 7.+   |
| --------- | ------------- | ----- | ----- | ----- |
| 0–1       | ·             | ·     | ·     | +0.35 |
| 2–3       | ·             | ·     | +0.00 | -0.20 |
| 4–5       | ·             | ·     | -0.06 | -1.30 |
| 6–7       | ·             | ·     | -1.06 | -1.80 |
| 8–9       | ·             | -0.46 | -1.72 | -1.79 |
| 10–11     | ·             | -1.46 | -1.87 | -1.53 |
| 12–13     | ·             | -1.60 | -1.75 | -1.46 |
| 14–15     | -1.77         | -1.82 | -1.67 | -1.34 |
| 16–17     | -1.71         | -1.66 | -1.52 | -1.23 |
| 18–19     | -1.21         | -1.64 | -1.51 | -1.07 |
| 20+       | -1.75         | -1.60 | -1.38 | -0.92 |

### 6 Spieler

| Schätzung | 1. Tischrunde | 2.–3. | 4.–6. | 7.+   |
| --------- | ------------- | ----- | ----- | ----- |
| 0–1       | ·             | ·     | ·     | +0.09 |
| 2–3       | ·             | ·     | +0.00 | -0.18 |
| 4–5       | ·             | ·     | -0.22 | -0.33 |
| 6–7       | ·             | ·     | -1.09 | -1.66 |
| 8–9       | ·             | -0.85 | -1.80 | -1.93 |
| 10–11     | ·             | -1.43 | -1.93 | -1.70 |
| 12–13     | ·             | -1.69 | -1.84 | -1.61 |
| 14–15     | -1.45         | -1.78 | -1.70 | -1.56 |
| 16–17     | -1.62         | -1.71 | -1.64 | -1.40 |
| 18–19     | -1.47         | -1.71 | -1.47 | -1.32 |
| 20+       | -1.76         | -1.64 | -1.29 | -1.08 |

## Wann lohnt sich der 10-Tausch, und mit wem?

Platzierungspunkte „tauschen“ minus „10 einfach ablegen“, nach Punktwert der eigenen und der Zielkarte
(soweit bekannt) und danach, ob der Gegner geschätzt führt.

| eigene Karte | Zielkarte | Ziel führt | Ziel führt nicht |
| ------------ | --------- | ---------- | ---------------- |
| 1–3          | 1–3       | -0.33      | ·                |
| 1–3          | 4–6       | -0.33      | ·                |
| 1–3          | 7–9       | ·          | ·                |
| 1–3          | 10        | ·          | ·                |
| 1–3          | verdeckt  | -0.40      | -0.35            |
| 4–6          | 1–3       | +0.32      | ·                |
| 4–6          | 4–6       | -0.15      | ·                |
| 4–6          | 7–9       | ·          | ·                |
| 4–6          | 10        | ·          | ·                |
| 4–6          | verdeckt  | +0.01      | -0.04            |
| 7–9          | 1–3       | ·          | ·                |
| 7–9          | 4–6       | ·          | ·                |
| 7–9          | 7–9       | ·          | ·                |
| 7–9          | 10        | ·          | ·                |
| 7–9          | verdeckt  | +0.29      | +0.19            |
| 10           | 1–3       | ·          | ·                |
| 10           | 4–6       | ·          | ·                |
| 10           | 7–9       | ·          | ·                |
| 10           | 10        | ·          | ·                |
| 10           | verdeckt  | +0.31      | +0.41            |
| verdeckt     | 1–3       | ·          | ·                |
| verdeckt     | 4–6       | ·          | ·                |
| verdeckt     | 7–9       | ·          | ·                |
| verdeckt     | 10        | ·          | ·                |
| verdeckt     | verdeckt  | +0.17      | +0.12            |

## Wann lohnt sich das Ablegen auf Verdacht?

Platzierungspunkte „unbekannte Karte auf Verdacht ablegen“ minus „normale Wahl“,
nach Wahrscheinlichkeit, dass die Karte passt.

| Trefferchance | Differenz | Std.-Fehler | Fälle |
| ------------- | --------- | ----------- | ----- |
| unter 5 %     | -0.66     | 0.010       | 30960 |
| 5–10 %        | -0.61     | 0.009       | 44024 |
| 10–20 %       | -0.67     | 0.030       | 3082  |
| 20 % und mehr | -0.60     | 0.212       | 67    |

## Wie viel bringen Paare gleichen Rangs?

- Gesparte Punkte je Endhand im Schnitt: 3.61 (60000 Hände)
- Ø Platzierungspunkte mit Paar: 0.13 (39769 Hände)
- Ø Platzierungspunkte ohne Paar: -0.26 (20231 Hände)
