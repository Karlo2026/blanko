import type { GameState, RoundScore, Rng } from '@blanko/engine';
import { seatPositions } from '../session/display.ts';
import { mainButton, tappableKeys } from '../session/interaction.ts';
import type { Session } from '../session/session.ts';
import { hintText } from '../session/texts.ts';
import { useTable } from '../session/use-table.ts';
import { Opponent } from './Opponent.tsx';
import { OwnHand } from './OwnHand.tsx';
import { Piles } from './Piles.tsx';
import { RoundEnd } from './RoundEnd.tsx';

interface RoundTableProps {
  readonly session: Session;
  readonly start: GameState;
  readonly rng: Rng;
  readonly ratingChange: number;
  readonly nextOpponentRating: number | null;
  readonly onScored: (score: RoundScore) => void;
  readonly onNextRound: () => void;
  readonly onEndSession: () => void;
}

/** Eine Runde am Tisch: Gegner rundherum, Stapel in der Mitte, eigene Karten unten. */
export function RoundTable({
  session,
  start,
  rng,
  ratingChange,
  nextOpponentRating,
  onScored,
  onNextRound,
  onEndSession,
}: RoundTableProps) {
  const table = useTable(session, start, rng, onScored);
  const { view, legal, selection } = table;
  const tappable = tappableKeys(view, legal, selection);
  const button = mainButton(view, legal, selection);
  const positions = seatPositions(session.names.length - 1);
  const canKnock = legal.some((a) => a.type === 'knock');
  return (
    <>
      <div className="table">
        {positions.map((position, index) => {
          const player = index + 1;
          return (
            <Opponent
              key={player}
              view={view}
              player={player}
              name={session.names[player] ?? '?'}
              position={position}
              tappable={tappable}
              changed={table.changed}
              reveal={table.reveal}
              onTap={table.tap}
            />
          );
        })}
        <div className="center">
          <Piles view={view} tappable={tappable} onTap={table.tap} />
        </div>
      </div>
      <div className="status" aria-live="polite">
        {table.status}
      </div>
      <div className="hint">{hintText(view, selection, session.names, canKnock)}</div>
      <OwnHand
        view={view}
        selection={selection}
        tappable={tappable}
        changed={table.changed}
        reveal={table.reveal}
        onTap={table.tap}
      />
      <div className="main-button-area">
        {button === 'knock' ? (
          <button type="button" className="main-button knock" onClick={table.knock}>
            Klopfen
          </button>
        ) : null}
        {button === 'cancel' ? (
          <button type="button" className="main-button" onClick={table.cancel}>
            Abbrechen
          </button>
        ) : null}
      </div>
      {table.score !== null ? (
        <RoundEnd
          session={session}
          score={table.score}
          knocker={view.knocker}
          ratingChange={ratingChange}
          nextOpponentRating={nextOpponentRating}
          onNext={onNextRound}
          onEnd={onEndSession}
        />
      ) : null}
    </>
  );
}
