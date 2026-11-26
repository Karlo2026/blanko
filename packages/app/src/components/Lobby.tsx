import { MAX_PLAYERS } from '@blanko/engine';
import type { ClientMessage, LobbyMessage } from '@blanko/protocol';
import { useState } from 'react';
import { inviteLink } from '../session/online.ts';

interface LobbyProps {
  readonly room: string;
  readonly seat: number;
  readonly lobby: LobbyMessage;
  readonly onSend: (message: ClientMessage) => void;
}

function seatNote(lobby: LobbyMessage, index: number): string {
  const seat = lobby.seats[index];
  if (seat === undefined) return '';
  if (seat.bot) return 'Bot';
  const host = index === lobby.host ? 'Gastgeber' : '';
  return [host, seat.connected ? '' : 'offline'].filter((t) => t !== '').join(', ');
}

/** Vor dem Start: wer am Tisch sitzt, Einladung teilen; der Gastgeber setzt Bots und Stufe. */
export function Lobby({ room, seat, lobby, onSend }: LobbyProps) {
  const [shareNote, setShareNote] = useState('');
  const host = lobby.host === seat;
  const hostName = lobby.seats[lobby.host]?.name ?? '?';
  const full = lobby.seats.length >= MAX_PLAYERS;

  const share = async (): Promise<void> => {
    const url = inviteLink(window.location, room);
    // Teilen gibt es nicht in jedem Browser, obwohl die Typen es immer versprechen.
    const nav: Partial<Navigator> = navigator;
    if (nav.share !== undefined) {
      try {
        await nav.share({
          title: 'Blanko',
          text: `Komm an meinen Blanko-Tisch!`,
          url,
        });
      } catch {
        // Teilen abgebrochen.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareNote('Link kopiert.');
    } catch {
      setShareNote(url);
    }
  };

  return (
    <>
      <p className="room-code" aria-label={`Raumcode ${room}`}>
        {room}
      </p>
      <p className="subtitle">Freunde treten mit diesem Code oder über den Link bei.</p>
      <div className="button-row">
        <button type="button" className="main-button" onClick={() => void share()}>
          Link teilen
        </button>
      </div>
      {shareNote === '' ? null : <p className="hint-text centered">{shareNote}</p>}

      <h2>
        Am Tisch ({lobby.seats.length} von {MAX_PLAYERS})
      </h2>
      <ol className="seats">
        {lobby.seats.map((s, index) => (
          <li key={`${String(index)}:${s.name}`} className={s.bot ? 'bot' : ''}>
            <span className="seat-name">
              {s.name}
              {index === seat ? ' (du)' : ''}
            </span>
            <span className="seat-note">{seatNote(lobby, index)}</span>
            {host && s.bot ? (
              <button
                type="button"
                className="text-button small"
                onClick={() => {
                  onSend({ type: 'removeBot', seat: index });
                }}
              >
                Entfernen
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {host && !full ? (
        <button
          type="button"
          className="text-button add-bot"
          onClick={() => {
            onSend({ type: 'addBot' });
          }}
        >
          Bot dazusetzen
        </button>
      ) : null}

      <h2>Stufe der Bots</h2>
      <div className="choices" role="radiogroup" aria-label="Stufe der Bots">
        {lobby.levels.map((l) => (
          <button
            key={l.level}
            type="button"
            role="radio"
            aria-checked={l.level === lobby.level}
            disabled={!host}
            className={`choice${l.level === lobby.level ? ' active' : ''}`}
            onClick={() => {
              onSend({ type: 'setLevel', level: l.level });
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="main-button-area go">
        {host ? (
          <button
            type="button"
            className="main-button knock"
            disabled={lobby.seats.length < 2}
            onClick={() => {
              onSend({ type: 'start' });
            }}
          >
            Spiel starten
          </button>
        ) : (
          <p className="hint-text">Warten, bis {hostName} das Spiel startet …</p>
        )}
      </div>
      {host && lobby.seats.length < 2 ? (
        <p className="hint-text centered">Lade jemanden ein oder setze einen Bot dazu.</p>
      ) : null}
    </>
  );
}
