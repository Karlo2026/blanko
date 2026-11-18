import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen.tsx';
import { Menu } from './components/Menu.tsx';
import { RulesPage } from './components/RulesPage.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { StatsPage } from './components/StatsPage.tsx';
import { loadAppProfiles, type AppProfiles } from './profiles.ts';
import { initialRating, loadRating, saveRating, type PlayerRating } from './session/rating.ts';
import type { SessionMode } from './session/session.ts';
import { loadTempo, saveTempo, type Tempo } from './session/tempo.ts';
import { addRound, addSession, loadStats, saveStats, type Stats } from './session/stats.ts';

interface Game {
  readonly mode: SessionMode;
  readonly botCount: number;
  readonly id: number;
}

type Overlay = 'menu' | 'rules' | 'stats' | null;

interface Loaded {
  readonly profiles: AppProfiles;
  readonly rating: PlayerRating;
}

export function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [stats, setStats] = useState<Stats>(() => loadStats(localStorage));
  const [tempo, setTempo] = useState<Tempo>(() => loadTempo(localStorage));
  const changeTempo = (next: Tempo): void => {
    saveTempo(localStorage, next);
    setTempo(next);
  };

  useEffect(() => {
    loadAppProfiles().then(
      (profiles) => {
        setLoaded({ profiles, rating: loadRating(localStorage, initialRating(profiles.levels)) });
      },
      (e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      },
    );
  }, []);

  const updateStats = (change: (stats: Stats) => Stats): void => {
    setStats((current) => {
      const next = change(current);
      saveStats(localStorage, next);
      return next;
    });
  };

  if (error !== null)
    return <p className="error">Die Gegner konnten nicht geladen werden: {error}</p>;
  if (loaded === null) return null;
  const { profiles, rating } = loaded;

  const changeRating = (next: PlayerRating): void => {
    saveRating(localStorage, next);
    setLoaded({ profiles, rating: next });
  };
  const back = (): void => {
    setOverlay(game === null ? null : 'menu');
  };
  return (
    <>
      {game === null ? (
        <StartScreen
          levels={profiles.levels}
          rating={rating.rating}
          tempo={tempo}
          onTempo={changeTempo}
          onStart={(mode, botCount) => {
            updateStats(addSession);
            setGame({ mode, botCount, id: Date.now() });
          }}
          onRules={() => {
            setOverlay('rules');
          }}
          onStats={() => {
            setOverlay('stats');
          }}
        />
      ) : (
        <GameScreen
          key={game.id}
          mode={game.mode}
          botCount={game.botCount}
          tempo={tempo}
          ladder={profiles.ladder}
          rating={rating}
          onRatingChange={changeRating}
          onRoundScored={(key, points, won) => {
            updateStats((s) => addRound(s, key, points, won));
          }}
          onMenu={() => {
            setOverlay('menu');
          }}
          onEnd={() => {
            setGame(null);
          }}
        />
      )}
      {overlay === 'menu' ? (
        <Menu
          tempo={tempo}
          onTempo={changeTempo}
          onResume={() => {
            setOverlay(null);
          }}
          onRules={() => {
            setOverlay('rules');
          }}
          onStats={() => {
            setOverlay('stats');
          }}
          onEnd={() => {
            setOverlay(null);
            setGame(null);
          }}
        />
      ) : null}
      {overlay === 'rules' ? <RulesPage onBack={back} /> : null}
      {overlay === 'stats' ? (
        <StatsPage stats={stats} levels={profiles.levels} rating={rating.rating} onBack={back} />
      ) : null}
    </>
  );
}
