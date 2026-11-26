import type { PlayerView } from '@blanko/engine';
import { faceFor } from '../session/display.ts';
import { tapKey, type Selection, type Tap } from '../session/interaction.ts';
import { CardView } from './CardView.tsx';

interface OwnHandProps {
  readonly view: PlayerView;
  readonly selection: Selection;
  readonly tappable: ReadonlySet<string>;
  readonly changed: ReadonlySet<string>;
  /** Anker, auf denen gerade eine Karte landet (siehe flights.ts). */
  readonly landing: ReadonlySet<string>;
  readonly reveal: { readonly player: number; readonly slot: number } | null;
  readonly onTap: (tap: Tap) => void;
}

function isSelected(selection: Selection, slot: number): boolean {
  return (selection.kind === 'match' || selection.kind === 'swap') && selection.slot === slot;
}

/** Die eigenen Karten groß im 2×2-Quadrat, Strafkarten in weiteren Reihen darunter. */
export function OwnHand({
  view,
  selection,
  tappable,
  changed,
  landing,
  reveal,
  onTap,
}: OwnHandProps) {
  const own = view.viewer;
  const hand = view.hands[own] ?? [];
  return (
    <div className="hand own">
      {hand.map((_, slot) => {
        const tap: Tap = { kind: 'own', slot };
        return (
          <CardView
            key={slot}
            face={faceFor(view, own, slot, reveal)}
            size="hand"
            label={`Deine Karte ${String(slot + 1)}`}
            tappable={tappable.has(tapKey(tap))}
            selected={isSelected(selection, slot)}
            changed={changed.has(`${String(own)}:${String(slot)}`)}
            anchor={`slot:${String(own)}:${String(slot)}`}
            landing={landing.has(`slot:${String(own)}:${String(slot)}`)}
            onTap={() => {
              onTap(tap);
            }}
          />
        );
      })}
    </div>
  );
}
