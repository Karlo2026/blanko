import type { PlayerView } from '@blanko/engine';
import type { Tap } from '../session/interaction.ts';
import { tapKey } from '../session/interaction.ts';
import { faceFor, type SeatPosition } from '../session/display.ts';
import { CardView } from './CardView.tsx';

interface OpponentProps {
  readonly view: PlayerView;
  readonly player: number;
  readonly name: string;
  readonly position: SeatPosition;
  readonly tappable: ReadonlySet<string>;
  readonly changed: ReadonlySet<string>;
  /** Anker, auf denen gerade eine Karte landet (siehe flights.ts). */
  readonly landing: ReadonlySet<string>;
  readonly reveal: { readonly player: number; readonly slot: number } | null;
  /** Online: Der Mensch auf diesem Platz ist gerade nicht verbunden. */
  readonly offline: boolean;
  readonly onTap: (tap: Tap) => void;
}

/** Ein Gegner mit seinen Karten verkleinert im 2×2-Quadrat; leere Plätze gestrichelt. */
export function Opponent({
  view,
  player,
  name,
  position,
  tappable,
  changed,
  landing,
  reveal,
  offline,
  onTap,
}: OpponentProps) {
  const hand = view.hands[player] ?? [];
  return (
    <div className={`opponent seat-${position}${view.current === player ? ' current' : ''}`}>
      <span className="name">{name}</span>
      <div className="hand">
        {hand.map((_, slot) => {
          const tap: Tap = { kind: 'opponent', player, slot };
          return (
            <CardView
              key={slot}
              face={faceFor(view, player, slot, reveal)}
              size="mini"
              label={`${name}, Karte ${String(slot + 1)}`}
              tappable={tappable.has(tapKey(tap))}
              changed={changed.has(`${String(player)}:${String(slot)}`)}
              anchor={`slot:${String(player)}:${String(slot)}`}
              landing={landing.has(`slot:${String(player)}:${String(slot)}`)}
              onTap={() => {
                onTap(tap);
              }}
            />
          );
        })}
      </div>
      {view.knocker === player ? <span className="knock-mark">klopft</span> : null}
      {offline ? <span className="offline-mark">ist offline</span> : null}
    </div>
  );
}
