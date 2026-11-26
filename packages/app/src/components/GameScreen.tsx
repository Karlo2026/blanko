import type { BotProfile } from '@blanko/bots';
import { createRng, type GameState, type RoundScore, type Rng } from '@blanko/engine';
import { useRef, useState } from 'react';
import { signed } from '../session/display.ts';
import { chooseOpponent, updateRating, type PlayerRating } from '../session/rating.ts';
import {
  completeRound,
  createSession,
  LOCAL_SEAT,
  startSessionRound,
  statsKey,
  type Session,
  type SessionMode,
} from '../session/session.ts';
import type { Tempo } from '../session/tempo.ts';
import { useLocalTable } from '../session/use-local-table.ts';
import { RoundEnd } from './RoundEnd.tsx';
import { RoundTable } from './RoundTable.tsx';
import { ScoreSheet } from './ScoreSheet.tsx';

interface GameScreenProps {
  readonly mode: SessionMode;
  readonly botCount: number;
  readonly tempo: Tempo;
  readonly ladder: readonly BotProfile[];
  readonly rating: PlayerRating;
  readonly onRatingChange: (rating: PlayerRating) => void;
  readonly onRoundScored: (statsKey: string, placementPoints: number, won: boolean) => void;
  readonly onMenu: () => void;
  readonly onEnd: () => void;
}

interface Round {
  readonly number: number;
  readonly start: GameState;
  /** Wertung des Menschen vor dieser Runde, um die Veränderung anzuzeigen. */
  readonly ratingBefore: number;
}

function profileFor(
  mode: SessionMode,
  ladder: readonly BotProfile[],
  rating: number,
  playerCount: number,
): BotProfile {
  return mode.kind === 'fixed' ? mode.level.profile : chooseOpponent(ladder, rating, playerCount);
}

const NOBODY_OFFLINE: ReadonlySet<number> = new Set();

interface LocalRoundProps {
  readonly session: Session;
  readonly start: GameState;
  readonly rng: Rng;
  readonly tempo: Tempo;
  readonly ratingChange: number;
  readonly nextOpponentRating: number | null;
  readonly onScored: (score: RoundScore) => void;
  readonly onNextRound: () => void;
  readonly onEndSession: () => void;
}

/** Eine Runde gegen die Bots im Browser. */
function LocalRound(props: LocalRoundProps) {
  const { session, start, rng, tempo, ratingChange, nextOpponentRating } = props;
  const table = useLocalTable(session, start, rng, tempo, props.onScored);
  const next =
    nextOpponentRating === null ? '' : ` · nächste Gegner: Stärke ${String(nextOpponentRating)}`;
  return (
    <>
      <RoundTable table={table} offline={NOBODY_OFFLINE} />
      {table.score !== null && !table.busy ? (
        <RoundEnd
          names={session.names}
          totals={session.board.totals}
          score={table.score}
          knocker={table.view.knocker}
          note={`Deine Stärke ${signed(Math.round(ratingChange))}${next}`}
          onNext={props.onNextRound}
          onEnd={props.onEndSession}
        />
      ) : null}
    </>
  );
}

/** Eine Sitzung aus beliebig vielen Runden; die Platzierungspunkte werden aufsummiert. */
export function GameScreen(props: GameScreenProps) {
  const { mode, botCount, tempo, ladder, rating, onRatingChange, onRoundScored, onMenu, onEnd } =
    props;
  const rng = useRef(createRng(Date.now() % 2 ** 31)).current;
  const [session, setSession] = useState<Session>(() =>
    createSession(mode, profileFor(mode, ladder, rating.rating, botCount + 1), botCount, rng),
  );
  const [round, setRound] = useState<Round>(() => ({
    number: 1,
    start: startSessionRound(session, rng),
    ratingBefore: rating.rating,
  }));

  const scored = (score: RoundScore): void => {
    const next = updateRating(rating, score, session.profile.rating ?? rating.rating);
    onRatingChange(next);
    setSession((current) =>
      completeRound(current, score, profileFor(mode, ladder, next.rating, current.names.length)),
    );
    onRoundScored(
      statsKey(mode),
      score.placementPoints[LOCAL_SEAT] ?? 0,
      score.ranking[0] === LOCAL_SEAT,
    );
  };

  const nextRound = (): void => {
    setRound({
      number: session.board.round,
      start: startSessionRound(session, rng),
      ratingBefore: rating.rating,
    });
  };

  return (
    <div className="screen">
      <header className="header">
        <h1>
          Blanko <span className="round">· Runde {round.number}</span>
        </h1>
        <span className="strength" aria-label="Deine Spielstärke">
          Stärke {Math.round(rating.rating)}
        </span>
        <button type="button" className="text-button" onClick={onMenu}>
          Menü
        </button>
      </header>
      <ScoreSheet names={session.names} totals={session.board.totals} />
      <LocalRound
        key={round.number}
        session={session}
        start={round.start}
        rng={rng}
        tempo={tempo}
        ratingChange={rating.rating - round.ratingBefore}
        nextOpponentRating={mode.kind === 'dynamic' ? session.profile.rating : null}
        onScored={scored}
        onNextRound={nextRound}
        onEndSession={onEnd}
      />
    </div>
  );
}
