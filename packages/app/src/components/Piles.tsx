import type { PlayerView } from '@blanko/engine';
import { tapKey, type Tap } from '../session/interaction.ts';
import { HUMAN } from '../session/session.ts';
import { CardView, type CardFace } from './CardView.tsx';

interface PilesProps {
  readonly view: PlayerView;
  readonly tappable: ReadonlySet<string>;
  readonly onTap: (tap: Tap) => void;
}

/** Nachzieh- und Ablagestapel nebeneinander; die gezogene Karte liegt offen über dem Stapel. */
export function Piles({ view, tappable, onTap }: PilesProps) {
  const top = view.discardPile.at(-1);
  const discardFace: CardFace = top === undefined ? { kind: 'empty' } : { kind: 'face', card: top };
  const someoneDrew = view.phase === 'drawn';
  const drawnFace: CardFace | null =
    view.drawnCard !== null
      ? { kind: 'face', card: view.drawnCard }
      : someoneDrew
        ? { kind: 'back' }
        : null;
  const draw: Tap = { kind: 'drawPile' };
  const discard: Tap = { kind: 'discardPile' };
  return (
    <div className="piles">
      <div className="pile">
        <div className="drawn-slot">
          {drawnFace === null ? null : (
            <CardView
              face={drawnFace}
              size="pile"
              arriving
              label={view.current === HUMAN ? 'Gezogene Karte' : 'Gezogene Karte des Gegners'}
            />
          )}
        </div>
        <CardView
          face={view.drawPileSize > 0 ? { kind: 'back' } : { kind: 'empty' }}
          size="pile"
          label="Nachziehstapel"
          tappable={tappable.has(tapKey(draw))}
          onTap={() => {
            onTap(draw);
          }}
        />
        <span className="label">Stapel</span>
      </div>
      <div className="pile">
        <CardView
          key={top?.id ?? 'leer'}
          face={discardFace}
          size="pile"
          arriving
          label="Ablagestapel"
          tappable={tappable.has(tapKey(discard))}
          onTap={() => {
            onTap(discard);
          }}
        />
        <span className="label">Ablage</span>
      </div>
    </div>
  );
}
