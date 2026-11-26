import type { LobbyMessage } from '@blanko/protocol';
import { useEffect, useRef, useState } from 'react';
import { Connection, type LinkState } from '../session/connection.ts';
import type { Entry, SavedSeat } from '../session/online.ts';
import type { Tempo } from '../session/tempo.ts';
import { useOnlineTable } from '../session/use-online-table.ts';
import { Lobby } from './Lobby.tsx';
import { RoundEnd } from './RoundEnd.tsx';
import { RoundTable } from './RoundTable.tsx';
import { ScoreSheet } from './ScoreSheet.tsx';

interface OnlineScreenProps {
  readonly serverUrl: string;
  readonly entry: Entry;
  readonly tempo: Tempo;
  /** Merkt sich den Platz für die Rückkehr; null, wenn es ihn nicht mehr gibt. */
  readonly onSeat: (seat: SavedSeat | null) => void;
  readonly onMenu: () => void;
  readonly onEnd: () => void;
}

interface Joined {
  readonly room: string;
  readonly seat: number;
}

/** So lange bleibt eine Fehlermeldung des Servers während des Spiels stehen. */
const ERROR_MS = 4000;

/** Online-Sitzung: Verbindung, Lobby und Tisch. Statistik und Spielerwertung gelten hier nicht. */
export function OnlineScreen({
  serverUrl,
  entry,
  tempo,
  onSeat,
  onMenu,
  onEnd,
}: OnlineScreenProps) {
  const [connection] = useState(() => new Connection(serverUrl, entry));
  const [link, setLink] = useState<LinkState>('connecting');
  const [joined, setJoined] = useState<Joined | null>(null);
  const [lobby, setLobby] = useState<LobbyMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Endgültiger Fehler: Raum weg, Name vergeben, Platz in anderem Fenster geöffnet … */
  const [fatal, setFatal] = useState<string | null>(null);
  const online = useOnlineTable(connection, tempo);
  const onSeatRef = useRef(onSeat);
  onSeatRef.current = onSeat;

  useEffect(() => {
    // Nach jedem Verbindungsaufbau meldet sich die Leitung an; ein Fehler darauf ist endgültig.
    let entering = true;
    let resuming = entry.type === 'resume';
    let lastError: string | null = null;
    const fail = (text: string): void => {
      connection.stop();
      if (resuming) onSeatRef.current(null);
      setFatal(text);
    };
    const unsubscribe = connection.subscribe((message) => {
      if (message.type === 'joined') {
        const seat: SavedSeat = { type: 'resume', room: message.room, token: message.token };
        connection.rejoinWith(seat);
        onSeatRef.current(seat);
        entering = false;
        resuming = true;
        setJoined({ room: message.room, seat: message.seat });
      } else if (message.type === 'lobby') {
        setLobby(message);
      } else if (message.type === 'error') {
        lastError = message.text;
        if (entering) fail(message.text);
        else setError(message.text);
      }
    });
    const unwatch = connection.onState((state) => {
      if (state === 'open') entering = true;
      if (state === 'closed') fail(lastError ?? 'Die Verbindung wurde beendet.');
      setLink(state);
    });
    connection.start();
    return () => {
      unsubscribe();
      unwatch();
      connection.stop();
    };
  }, [connection]);

  useEffect(() => {
    if (error === null) return;
    const timer = setTimeout(() => {
      setError(null);
    }, ERROR_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [error]);

  if (fatal !== null) {
    return (
      <div className="screen start">
        <p className="title">Online</p>
        <p className="error">{fatal}</p>
        <div className="main-button-area go">
          <button type="button" className="main-button" onClick={onEnd}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (joined === null || lobby === null) {
    return (
      <div className="screen start">
        <p className="title">Online</p>
        <p className="subtitle">{link === 'waking' ? 'Server wird geweckt …' : 'Verbinde …'}</p>
        {link === 'waking' ? (
          <p className="hint-text centered">
            Der Server schläft nach einer Viertelstunde ohne Spiel. Aufwachen dauert bis zu einer
            Minute.
          </p>
        ) : null}
        <div className="button-row go">
          <button type="button" className="text-button" onClick={onEnd}>
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  const isHost = lobby.host === joined.seat;
  const hostName = lobby.seats[lobby.host]?.name ?? '?';
  const note = link === 'lost' ? 'Verbindung unterbrochen, verbinde neu …' : (error ?? '');
  const playing = lobby.phase !== 'lobby' && online !== null;
  const offline = new Set(
    lobby.seats.flatMap((seat, index) => (seat.bot || seat.connected ? [] : [index])),
  );
  return (
    <div className={`screen${playing ? '' : ' start'}`}>
      <header className="header">
        <h1>
          Blanko{' '}
          <span className="round">
            · {playing ? `Runde ${String(online.round)}` : `Raum ${joined.room}`}
          </span>
        </h1>
        <button type="button" className="text-button" onClick={onMenu}>
          Menü
        </button>
      </header>
      {note === '' ? null : <p className="link-note">{note}</p>}
      {playing ? (
        <>
          <ScoreSheet names={online.table.names} totals={online.totals} />
          <RoundTable table={online.table} offline={offline} />
          {online.table.score !== null && !online.table.busy ? (
            <RoundEnd
              names={online.table.names}
              totals={online.totals}
              score={online.table.score}
              knocker={online.table.view.knocker}
              note={isHost ? '' : `Warten, bis ${hostName} die nächste Runde startet …`}
              onNext={
                isHost
                  ? () => {
                      connection.send({ type: 'nextRound' });
                    }
                  : null
              }
              onEnd={onEnd}
            />
          ) : null}
        </>
      ) : (
        <Lobby
          room={joined.room}
          seat={joined.seat}
          lobby={lobby}
          onSend={(message) => {
            connection.send(message);
          }}
        />
      )}
    </div>
  );
}
