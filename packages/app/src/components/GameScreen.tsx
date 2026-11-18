import { createRng, type GameState, type RoundScore } from '@blanko/engine';
import { useRef, useState } from 'react';
import type { Level } from '../profiles.ts';
import {
  completeRound,
  createSession,
  HUMAN,
  startSessionRound,
  type Session,
} from '../session/session.ts';
import { RoundTable } from './RoundTable.tsx';
import { ScoreSheet } from './ScoreSheet.tsx';

interface GameScreenProps {
  readonly level: Level;
  readonly botCount: number;
  readonly onRoundScored: (level: string, placementPoints: number, won: boolean) => void;
  readonly onMenu: () => void;
  readonly onEnd: () => void;
}

interface Round {
  readonly number: number;
  readonly start: GameState;
}

/** Eine Sitzung aus beliebig vielen Runden; die Platzierungspunkte werden aufsummiert. */
export function GameScreen({ level, botCount, onRoundScored, onMenu, onEnd }: GameScreenProps) {
  const rng = useRef(createRng(Date.now() % 2 ** 31)).current;
  const [session, setSession] = useState<Session>(() => createSession(level, botCount, rng));
  const [round, setRound] = useState<Round>(() => ({
    number: 1,
    start: startSessionRound(session, rng),
  }));

  const scored = (score: RoundScore): void => {
    setSession((current) => completeRound(current, score));
    onRoundScored(level.level, score.placementPoints[HUMAN] ?? 0, score.ranking[0] === HUMAN);
  };

  const nextRound = (): void => {
    setRound({ number: session.round, start: startSessionRound(session, rng) });
  };

  return (
    <div className="screen">
      <header className="header">
        <h1>
          Blanko <span className="round">· Runde {round.number}</span>
        </h1>
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
        onScored={scored}
        onNextRound={nextRound}
        onEndSession={onEnd}
      />
    </div>
  );
}
