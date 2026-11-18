import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen.tsx';
import { Menu } from './components/Menu.tsx';
import { RulesPage } from './components/RulesPage.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { StatsPage } from './components/StatsPage.tsx';
import { loadLevels, type Level } from './profiles.ts';
import { addRound, addSession, loadStats, saveStats, type Stats } from './session/stats.ts';

interface Game {
  readonly level: Level;
  readonly botCount: number;
  readonly id: number;
}

type Overlay = 'menu' | 'rules' | 'stats' | null;

export function App() {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [stats, setStats] = useState<Stats>(() => loadStats(localStorage));

  useEffect(() => {
    loadLevels().then(setLevels, (e: unknown) => {
      setError(e instanceof Error ? e.message : String(e));
    });
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
  if (levels === null) return null;

  const back = (): void => {
    setOverlay(game === null ? null : 'menu');
  };
  return (
    <>
      {game === null ? (
        <StartScreen
          levels={levels}
          onStart={(level, botCount) => {
            updateStats(addSession);
            setGame({ level, botCount, id: Date.now() });
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
          level={game.level}
          botCount={game.botCount}
          onRoundScored={(level, points, won) => {
            updateStats((s) => addRound(s, level, points, won));
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
      {overlay === 'stats' ? <StatsPage stats={stats} levels={levels} onBack={back} /> : null}
    </>
  );
}
