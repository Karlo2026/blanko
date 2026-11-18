import type { BotProfile } from '@blanko/bots';
import { createRng, type GameState, type RoundScore } from '@blanko/engine';
import { useRef, useState } from 'react';
import { chooseOpponent, updateRating, type PlayerRating } from '../session/rating.ts';
import {
  completeRound,
  createSession,
  HUMAN,
  startSessionRound,
  statsKey,
  type Session,
  type SessionMode,
} from '../session/session.ts';
import { RoundTable } from './RoundTable.tsx';
import { ScoreSheet } from './ScoreSheet.tsx';

interface GameScreenProps {
  readonly mode: SessionMode;
  readonly botCount: number;
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

/** Eine Sitzung aus beliebig vielen Runden; die Platzierungspunkte werden aufsummiert. */
export function GameScreen(props: GameScreenProps) {
  const { mode, botCount, ladder, rating, onRatingChange, onRoundScored, onMenu, onEnd } = props;
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
    onRoundScored(statsKey(mode), score.placementPoints[HUMAN] ?? 0, score.ranking[0] === HUMAN);
  };

  const nextRound = (): void => {
    setRound({
      number: session.round,
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
      <ScoreSheet names={session.names} totals={session.totals} />
      <RoundTable
        key={round.number}
        session={session}
        start={round.start}
        rng={rng}
        ratingChange={rating.rating - round.ratingBefore}
        nextOpponentRating={mode.kind === 'dynamic' ? session.profile.rating : null}
        onScored={scored}
        onNextRound={nextRound}
        onEndSession={onEnd}
      />
    </div>
  );
}
