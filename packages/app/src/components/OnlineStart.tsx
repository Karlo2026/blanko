import { MAX_NAME_LENGTH, ROOM_CODE_LENGTH } from '@blanko/protocol';
import { useState } from 'react';
import { validName, validRoomCode, type Entry, type OnlineMemory } from '../session/online.ts';

interface OnlineStartProps {
  /** Raumcode aus einem Einladungslink, sonst leer. */
  readonly invitedTo: string;
  readonly memory: OnlineMemory;
  readonly onEnter: (entry: Entry, name: string) => void;
  readonly onBack: () => void;
}

/** Online spielen: Namen eingeben, dann Raum erstellen, mit Code beitreten oder zurück an den Tisch. */
export function OnlineStart({ invitedTo, memory, onEnter, onBack }: OnlineStartProps) {
  const [name, setName] = useState(memory.name);
  const [code, setCode] = useState(invitedTo);
  const validated = validName(name);
  const room = validRoomCode(code);
  const { seat } = memory;
  return (
    <div className="screen start">
      <p className="title">Online</p>
      <p className="subtitle">Mit Freunden an einem Tisch; freie Plätze übernehmen Bots.</p>
      {seat === null || invitedTo !== '' ? null : (
        <>
          <h2>Zurück an den Tisch</h2>
          <button
            type="button"
            className="main-button knock"
            onClick={() => {
              onEnter(seat, memory.name);
            }}
          >
            Raum {seat.room}
          </button>
        </>
      )}
      <h2>
        <label htmlFor="online-name">Dein Name</label>
      </h2>
      <input
        id="online-name"
        className="field"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        enterKeyHint="done"
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
      {invitedTo === '' ? (
        <>
          <h2>Neuer Tisch</h2>
          <button
            type="button"
            className="main-button knock"
            disabled={validated === null}
            onClick={() => {
              if (validated !== null) onEnter({ type: 'create', name: validated }, validated);
            }}
          >
            Raum erstellen
          </button>
        </>
      ) : null}
      <h2>
        <label htmlFor="online-code">Mit Code beitreten</label>
      </h2>
      <div className="join-row">
        <input
          id="online-code"
          className="field code"
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="Code"
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
          }}
        />
        <button
          type="button"
          className={`main-button${invitedTo === '' ? '' : ' knock'}`}
          disabled={validated === null || room === null}
          onClick={() => {
            if (validated !== null && room !== null)
              onEnter({ type: 'join', room, name: validated }, validated);
          }}
        >
          Beitreten
        </button>
      </div>
      <div className="button-row go">
        <button type="button" className="text-button" onClick={onBack}>
          Zurück
        </button>
      </div>
    </div>
  );
}
