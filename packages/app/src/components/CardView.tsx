import type { Card } from '@blanko/engine';
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
  readonly arriving?: boolean;
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
  arriving = false,
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
    arriving ? 'arriving' : '',
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
  if (!tappable) {
    return (
      <div className={classes} aria-label={cardLabel(face, label)} role="img">
        {content}
      </div>
    );
  }
  return (
    <button type="button" className={classes} aria-label={cardLabel(face, label)} onClick={onTap}>
      {content}
    </button>
  );
}
