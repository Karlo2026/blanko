# ADR 0009: Online-Mehrspieler

**Status:** angenommen (Phase 10)

Freunde spielen über einen Raum-Link an einem Tisch, freie Plätze füllen Bots. Der
Einzelspielermodus bleibt unverändert und offline nutzbar.

## Entscheidungen

- **Der Server kennt als Einziger das ganze Spiel.** `GameState`, Stapel und `Rng` bleiben auf dem
  Server. Jeder Platz bekommt nur `getPlayerView` für sich, die Ereignisse (laut ADR 0002
  öffentlich) und seine erlaubten Züge. Ein Test prüft über 20 Seeds, dass jede `update`-Nachricht
  an Platz X genau `getPlayerView(state, X)` enthält und keine Karte serialisiert, die X nicht
  kennt.
- **Spiellogik nur in engine und bots.** Server und App rufen sie nur auf. Was Server und App
  gemeinsam brauchen, ist dorthin umgezogen, statt kopiert zu werden:
  - nach engine: der Spielstand über Runden (`newScoreboard`, `recordRound`)
  - nach bots: Bot-Namen, das Einlesen von `profiles.json` (`parseProfileFile`), das
    Worker-Protokoll (`createBotAnswerer`) und das Gedächtnis aller Plätze (`rememberAll`)
- **Paket `protocol`:** Es enthält die Nachrichtentypen und ihre Prüfung. Eingehende Nachrichten
  sind `unknown` und werden vollständig geprüft, nach dem Muster von `bots/src/validate.ts`.
  Unbekannte Typen und unbekannte Felder werden abgelehnt.
  - Raumcodes haben 4 Zeichen ohne 0/O und 1/I/L.
  - Namen werden getrimmt, haben 1 bis 16 Zeichen, keine Steuerzeichen und sind im Raum eindeutig
    (Groß- und Kleinschreibung zählt nicht).
- **Raum-Logik als Reducer.** `handle(room, seat, message, rng)` liefert `{ room, outbox }` wie
  `applyAction`, ohne Netzwerk und ohne Uhr. Zwei Abweichungen von der Vorgabe:
  - `create`, `join` und `resume` laufen über eigene reine Funktionen (`createRoom`, `joinRoom`,
    `resumeRoom`), weil es vor dem Betreten weder einen Raum noch einen Platz gibt.
  - Der `Rng` liegt im Hub neben dem Raum und wird hineingereicht; der Raum bleibt reine Daten.
- **Sicherheitsregel:** `applyAction` prüft nur, ob ein Zug erlaubt ist, nicht wer ihn schickt.
  Eine `action` wird daher nur angenommen, wenn der Absender ein Mensch ist und `state.current`
  entspricht. Für Bots kann niemand ziehen.
- **Protokoll-Ergänzungen:**
  - `lobby` enthält zusätzlich `phase` und die Liste der Stufen, weil die Lobby beides anzeigt.
  - `removeBot` nennt den Platz.
  - Rücken Plätze nach dem Entfernen eines Bots auf, bekommen betroffene Menschen ein neues
    `joined` mit ihrem neuen Platz.
- **Gastgeber** ist der Ersteller. Nur er setzt Bots, wählt die Stufe, startet und beginnt die
  nächste Runde. Beitritt in ein laufendes Spiel geht nur per `resume`.
- **Bots in `worker_threads`**, damit ein langer ISMCTS-Zug nicht alle Räume blockiert.
  - Höchstens 4 Worker, einer weniger als Kerne.
  - Vor jedem Bot-Zug 1,2 s Pause.
  - Der Zug gilt nur, wenn der Tisch beim Eintreffen noch genau darauf wartet.
  - Ein Fehler im Bot führt zum ersten erlaubten Zug, damit der Tisch nicht hängt.
- **Räume liegen im Speicher.**
  - Ein Raum ohne verbundene Menschen wird nach 30 Minuten gelöscht.
  - **Ein Neustart des Servers verliert alle Räume.** Das ist bewusst so: Das Gratis-Hosting hat
    keine Datenbank, und eine Runde dauert nur Minuten. Wer danach zurückkehrt, bekommt „Diesen
    Raum gibt es nicht (mehr).“, und die App vergisst den gespeicherten Platz.
- **Schutz:**
  - Origin nur `https://karlo2026.github.io` und `localhost`.
  - `maxPayload` 16 KB.
  - Höchstens 40 Nachrichten je 10 s und Verbindung. Danach Fehlermeldung und Schließen mit Code
    4000; die App verbindet dann nicht neu.
  - Öffnet jemand denselben Platz in einem zweiten Fenster, übernimmt das neue, und das alte wird
    ebenso mit 4000 getrennt.
- **Abwesende Spieler:** Ist ein Mensch am Zug und seit 60 s nicht verbunden, rechnet ein Bot der
  Raum-Stufe seinen Zug.
  - Der Bot nutzt das volle Wissen des Menschen; Vergessen gilt nur für Bots.
  - `automaticFrom` sagt, ab wann ein Platz automatisch gespielt wird. Der Hub wartet bis dahin und
    prüft beim Auslösen erneut.
  - Wer zurückkommt, zieht ab der nächsten Aktion selbst; ein noch gerechneter Bot-Zug verfällt.

### App

- **Der eigene Platz kommt aus `view.viewer`.** `HUMAN = 0` heißt jetzt `LOCAL_SEAT` und gilt nur
  noch für den Einzelspielermodus (Sitzung, Spielerwertung, Statistik). Texte, Anzeige, Flüge und
  Antippen fragen die Sicht.
- **Gedrehter Tisch:** Der eigene Platz ist unten, die Gegner folgen im Uhrzeigersinn ab
  `viewer + 1` (`opponentOrder`).
- **Eine Tisch-Schnittstelle, zwei Quellen:**
  - `useLocalTable` (bisheriges Verhalten) und `useOnlineTable` liefern denselben `Table`.
  - Gemeinsam ist `table.ts`: Szene, Folgeszene mit Flügen aus `flightsFor`, Zeitgeber und
    Antippen über `resolveTap`.
  - Abweichung: Der Teil, der „keinen Unterschied merkt“, ist `RoundTable`. `GameScreen` bleibt die
    lokale Sitzung mit Spielerwertung, Statistik und dynamischem Modus, die online nicht gelten.
    Online übernimmt `OnlineScreen` Verbindung, Lobby und Rundenende.
- **Warteschlange:** `update` und `roundScored` werden nacheinander abgespielt. Die nächste
  Nachricht wartet, solange Karten fliegen oder eine angeschaute Karte offen liegt, damit jede
  Bewegung zu sehen ist. Nach einem eigenen Zug ist nichts antippbar, bis der Server antwortet.
- **Verbindung:**
  - Automatisches Wiederverbinden nach 0,5 s, danach doppelt so lange, höchstens 15 s.
  - `ping` alle 25 s.
  - Name, Raumcode und Token liegen im `localStorage`. Nach jedem Verbindungsaufbau meldet sich die
    App per `resume` auf denselben Platz.
  - Dauert die erste Verbindung länger als 3 s, steht dort „Server wird geweckt …“.
- **Einladung:** Ein Link `…/?raum=CODE` öffnet direkt den Beitritt; der Code verschwindet danach
  aus der Adresszeile. Teilen geht über `navigator.share`, sonst wird der Link kopiert.
- **Server-Adresse aus `VITE_SERVER_URL`.**
  - Im Workflow kommt sie aus der Repository-Variable `BLANKO_SERVER_URL`.
  - Ohne sie gibt es kein „Online spielen“.
  - `https://` wird zu `wss://`, damit beide Schreibweisen gehen.
- **Online gelten weder Statistik noch Spielerwertung noch der dynamische Modus.**

## Betrieb auf Render

Web Service mit diesen Einstellungen:

- Build-Befehl: `npm ci`
- Start-Befehl: `node packages/server/src/main.ts`
- Health Check: `/health`
- Node 24: aus `engines` in der Wurzel-`package.json`, sonst Umgebungsvariable `NODE_VERSION=24`
- `PORT` setzt Render selbst.

Der Gratis-Plan schläft nach 15 Minuten ohne Verbindung; das erste Verbinden weckt ihn.

## Abhängigkeiten

| Paket         | Warum                                                                               |
| ------------- | ----------------------------------------------------------------------------------- |
| `ws`          | WebSocket-Server für Node; die einzige neue Laufzeitabhängigkeit                    |
| `@types/ws`   | Typen für `ws`, nur zur Entwicklung                                                 |
| `@types/node` | Typen für `node:http`, `node:worker_threads` und `node:crypto`, nur zur Entwicklung |

Die App nutzt den WebSocket des Browsers und braucht nichts Neues außer dem eigenen Paket
`protocol`.

## Geprüft

- **Tests:**
  - Protokollprüfung.
  - Raum-Logik: Datenschutz über 20 Seeds, Züge außerhalb der Reihe, niemand zieht für Bots,
    ganze Runde mit Wertung, abwesende Spieler.
  - Hub mit falschen Verbindungen: Beitritt, kaputte Nachrichten, Drosselung, Rückkehr, zweites
    Fenster, Bot-Pause, abwesende Spieler, Aufräumen.
  - App: eigener Platz ≠ 0, gedrehter Tisch, Einladungslink, Speicher, Wiederverbindungsabstand.
  - Alle bestehenden Tests sind grün. Angepasst wurden nur Aufrufe: `moveText` nennt den eigenen
    Platz, `profiles.test` nutzt `parseProfileFile` und `session.board`.
- **Lokal mit Server und zwei Browser-Tabs in iPhone-Größe (390 × 844):**
  - Raum erstellen, Einladungslink, vergebener Name, Beitritt, Bot dazusetzen, Start.
  - Jeder Tab sieht den Tisch von seinem Platz und nur die eigenen Karten. Eine gezogene Karte ist
    nur für den Ziehenden offen, eine per 8 angeschaute nur für den, der schaut.
  - „ist offline“ und die Statuszeile, Rückkehr per „Zurück an den Tisch“.
  - Rundenende mit „Nächste Runde“ nur für den Gastgeber, nächste Runde mit übernommenen Summen.
  - Der Einzelspielermodus läuft unverändert.
- **Abwesende Spieler am echten Server, mit echter Zeit und echtem Worker:** Ben trennt sich, als
  er am Zug ist. 58 s passiert nichts. Nach 60 s zieht ein Bot für ihn und behält die Karte, und
  Ben kommt per `resume` auf Platz 1 zurück.
- **Server:** `/health` antwortet 200, ein fremder Origin bekommt 403, und eine ganze Runde läuft
  per Skript über WebSocket mit Bots im Worker.
- **Verbindung:** Mit gestopptem Server zeigt die App erst „Verbinde …“, nach 3 s „Server wird
  geweckt …“. Nach dem Start des Servers verbindet sie von selbst und öffnet den Raum. Ein Spieler,
  der während des Neustarts in einem Spiel saß, bekommt „Diesen Raum gibt es nicht (mehr).“, und
  der gespeicherte Platz ist vergessen.
- **Nicht geprüft:**
  - Die Einrichtung bei Render selbst; sie braucht das Konto des Nutzers.
  - Echte iPhones im Mobilfunknetz.
  - Das Aufwachen eines echten schlafenden Servers bei Render; lokal ist es nur mit einem
    gestoppten Server nachgestellt.

## Bekannte Punkte

- Verlässt der Gastgeber das Spiel, kann niemand die nächste Runde starten. Den Gastgeber
  weiterzugeben ist nicht umgesetzt.
- Sind alle Menschen weg, spielen Bots die laufende Runde zu Ende; danach wartet der Raum, bis er
  gelöscht wird.
- Zwei Tabs im selben Browser teilen sich den `localStorage`; „Zurück an den Tisch“ kennt nur den
  zuletzt betretenen Platz.
- Die Stufen sind noch nicht nach den Hausregeln vom 26.11. neu vermessen (wie in der App).
