interface RulesPageProps {
  readonly onBack: () => void;
}

/** Die Spielregeln zum Nachlesen, wie sie die Engine umsetzt. */
export function RulesPage({ onBack }: RulesPageProps) {
  return (
    <div className="overlay page">
      <h2>Regeln</h2>
      <p>
        Ziel: Am Ende der Runde möglichst wenig Punkte vor sich liegen haben. Jeder bekommt vier
        verdeckte Karten im Quadrat und sieht sich zu Beginn nur die zwei unteren an – bis zum
        ersten Ziehen. Danach heißt es: merken.
      </p>
      <h2>Ein Zug</h2>
      <ul>
        <li>
          <strong>Ziehen:</strong> Stapel antippen. Dann eine eigene Karte antippen, um zu tauschen
          (die getauschte kommt offen auf die Ablage), oder die Ablage antippen, um die gezogene
          Karte abzulegen.
        </li>
        <li>
          <strong>Gleiche Karte ablegen:</strong> Hat dein Vorgänger eine Karte abgeworfen, darfst
          du eine eigene Karte gleichen Rangs ablegen: Karte antippen, dann die Ablage. Passt sie
          nicht, geht sie zurück und du bekommst eine unbesehene Strafkarte.
        </li>
        <li>
          <strong>Klopfen:</strong> Wer glaubt, die niedrigste Hand zu haben, klopft. Danach hat
          jeder andere noch genau einen Zug, dann wird aufgedeckt. Die Karten des Klopfers bleiben
          unverändert.
        </li>
      </ul>
      <h2>Sonderkarten</h2>
      <p>Nur wenn frisch gezogen und direkt abgelegt:</p>
      <table>
        <tbody>
          <tr>
            <th>8</th>
            <td>eine eigene Karte anschauen</td>
          </tr>
          <tr>
            <th>9</th>
            <td>eine Karte eines Gegners anschauen</td>
          </tr>
          <tr>
            <th>10</th>
            <td>eine eigene Karte blind mit einer gegnerischen tauschen (nicht mit dem Klopfer)</td>
          </tr>
        </tbody>
      </table>
      <p className="muted">Ein zweiter Tipp auf die Ablage legt die Sonderkarte ohne Wirkung ab.</p>
      <h2>Wertung</h2>
      <p>
        Ass 1, 2 bis 10 nach Augenzahl, Bube, Dame und König 10. Gleiche Ränge zählen nur einmal:
        Zwei Könige sind 10 Punkte, König und Dame 20.
      </p>
      <p>
        Wer klopft, aber nicht allein die niedrigste Punktzahl hat, wird Letzter. Sonst gewinnt die
        niedrigste Punktzahl. Platz 1 bekommt +2, der letzte −2; ab vier Spielern Platz 2 zusätzlich
        +1 und der vorletzte −1.
      </p>
      <button type="button" className="main-button" onClick={onBack}>
        Zurück
      </button>
    </div>
  );
}
