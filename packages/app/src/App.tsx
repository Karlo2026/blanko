import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen.tsx';
import { Menu } from './components/Menu.tsx';
import { OnlineScreen } from './components/OnlineScreen.tsx';
import { OnlineStart } from './components/OnlineStart.tsx';
import { RulesPage } from './components/RulesPage.tsx';
import { StartScreen } from './components/StartScreen.tsx';
import { StatsPage } from './components/StatsPage.tsx';
import type { ProfileFile } from '@blanko/bots';
import { loadAppProfiles } from './profiles.ts';
import {
  loadOnline,
  roomFromSearch,
  saveOnline,
  SERVER_URL,
  type Entry,
  type OnlineMemory,
} from './session/online.ts';
import { initialRating, loadRating, saveRating, type PlayerRating } from './session/rating.ts';
import type { SessionMode } from './session/session.ts';
import { loadTempo, saveTempo, type Tempo } from './session/tempo.ts';
import { addRound, addSession, loadStats, saveStats, type Stats } from './session/stats.ts';

type Game =
  | {
      readonly kind: 'local';
      readonly mode: SessionMode;
      readonly botCount: number;
      readonly id: number;
    }
  | { readonly kind: 'online'; readonly entry: Entry; readonly id: number };

/** Raumcode aus einem Einladungslink; danach verschwindet er aus der Adresszeile. */
function takeInvite(): string {
  const room = SERVER_URL === null ? null : roomFromSearch(window.location.search);
  if (room !== null) window.history.replaceState(null, '', window.location.pathname);
  return room ?? '';
}

type Overlay = 'menu' | 'rules' | 'stats' | null;

interface Loaded {
  readonly profiles: ProfileFile;
  readonly rating: PlayerRating;
}

export function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [invite] = useState(takeInvite);
  /** Die Online-Startseite ist offen; nach einem Online-Spiel geht es dorthin zurück. */
  const [onlineStart, setOnlineStart] = useState(invite !== '');
  const [onlineMemory, setOnlineMemory] = useState<OnlineMemory>(() => loadOnline(localStorage));
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
  const rememberOnline = (next: OnlineMemory): void => {
    saveOnline(localStorage, next);
    setOnlineMemory(next);
  };
  const toMenu = (): void => {
    setOverlay('menu');
  };
  const endGame = (): void => {
    setGame(null);
  };
  return (
    <>
      {game === null && onlineStart && SERVER_URL !== null ? (
        <OnlineStart
          invitedTo={invite}
          memory={onlineMemory}
          onEnter={(entry, name) => {
            rememberOnline({ ...onlineMemory, name });
            setGame({ kind: 'online', entry, id: Date.now() });
          }}
          onBack={() => {
            setOnlineStart(false);
          }}
        />
      ) : null}
      {game === null && !onlineStart ? (
        <StartScreen
          levels={profiles.levels}
          rating={rating.rating}
          tempo={tempo}
          onTempo={changeTempo}
          onStart={(mode, botCount) => {
            updateStats(addSession);
            setGame({ kind: 'local', mode, botCount, id: Date.now() });
          }}
          onOnline={
            SERVER_URL === null
              ? null
              : () => {
                  setOnlineStart(true);
                }
          }
          onRules={() => {
            setOverlay('rules');
          }}
          onStats={() => {
            setOverlay('stats');
          }}
        />
      ) : null}
      {game?.kind === 'online' && SERVER_URL !== null ? (
        <OnlineScreen
          key={game.id}
          serverUrl={SERVER_URL}
          entry={game.entry}
          tempo={tempo}
          onSeat={(seat) => {
            setOnlineMemory((current) => {
              const next = { ...current, seat };
              saveOnline(localStorage, next);
              return next;
            });
          }}
          onMenu={toMenu}
          onEnd={endGame}
        />
      ) : null}
      {game?.kind === 'local' ? (
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
          onMenu={toMenu}
          onEnd={endGame}
        />
      ) : null}
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
