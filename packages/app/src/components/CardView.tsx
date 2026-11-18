import type { Card } from '@blanko/engine';
import type React from 'react';
import { isRed, rankLabel, SUIT_SYMBOLS } from '../session/card-names.ts';

export type CardFace =
  | { readonly kind: 'back' }
  | { readonly kind: 'face'; readonly card: Card }
  | { readonly kind: 'empty' };

interface CardViewProps {
  readonly face: CardFace;
  readonly size: 'hand' | 'pile' | 'mini';
  readonly tappable?: boolean;
  readonly selected?: boolean;
  readonly changed?: boolean;
  /** Stelle am Tisch, von der Karten abfliegen oder auf der sie landen (siehe flights.ts). */
  readonly anchor?: string;
  /** Gerade landet hier eine fliegende Karte; bis dahin bleibt der Platz unsichtbar. */
  readonly landing?: boolean;
  /** Feste Breite in Pixeln statt der Größenklasse, für fliegende Karten. */
  readonly width?: number;
  readonly label: string;
  readonly onTap?: () => void;
}

function cardLabel(face: CardFace, label: string): string {
  if (face.kind === 'face') return `${label}: ${rankLabel(face.card.rank)} ${face.card.suit}`;
  if (face.kind === 'empty') return `${label}: leer`;
  return `${label}: verdeckt`;
}

/** Eine Karte. Antippbar ist sie nur mit weißem Rahmen; alles andere reagiert nicht. */
export function CardView({
  face,
  size,
  tappable = false,
  selected = false,
  changed = false,
  anchor,
  landing = false,
  width,
  label,
  onTap,
}: CardViewProps) {
  const classes = [
    'card',
    `size-${size}`,
    face.kind,
    face.kind === 'face' && isRed(face.card) ? 'red' : '',
    tappable ? 'tappable' : '',
    selected ? 'selected' : '',
    changed ? 'changed' : '',
    landing ? 'landing' : '',
  ]
    .filter((c) => c !== '')
    .join(' ');
  const content =
    face.kind === 'face' && size !== 'mini' ? (
      <>
        <span className="rank">{rankLabel(face.card.rank)}</span>
        <span className="suit">{SUIT_SYMBOLS[face.card.suit]}</span>
      </>
    ) : face.kind === 'face' ? (
      <span className="rank">{rankLabel(face.card.rank)}</span>
    ) : null;
  const style =
    width === undefined ? undefined : ({ '--w': `${String(width)}px` } as React.CSSProperties);
  if (!tappable) {
    return (
      <div
        className={classes}
        aria-label={cardLabel(face, label)}
        role="img"
        data-anchor={anchor}
        style={style}
      >
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      aria-label={cardLabel(face, label)}
      data-anchor={anchor}
      style={style}
      onClick={onTap}
    >
      {content}
    </button>
  );
}
