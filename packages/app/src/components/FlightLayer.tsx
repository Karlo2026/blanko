import { useLayoutEffect, useRef } from 'react';
import { CardView, type CardFace } from './CardView.tsx';

/** Eine fliegende Karte: Startposition schon gemessen, Ziel wird nach dem Neuzeichnen gesucht. */
export interface Flight {
  readonly id: number;
  readonly from: DOMRect;
  readonly toKey: string;
  readonly face: CardFace;
  readonly delayMs: number;
  readonly durationMs: number;
}

/** Position eines Ankers auf dem Bildschirm; null, wenn er gerade nicht gezeichnet ist. */
export function measureAnchor(key: string): DOMRect | null {
  return document.querySelector(`[data-anchor="${key}"]`)?.getBoundingClientRect() ?? null;
}

function FlyingCard({ flight }: { readonly flight: Flight }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    const target = measureAnchor(flight.toKey);
    if (element === null || target === null) return;
    const dx = target.left - flight.from.left;
    const dy = target.top - flight.from.top;
    const scaleX = target.width / flight.from.width;
    const scaleY = target.height / flight.from.height;
    const animation = element.animate(
      [
        { transform: 'translate(0, 0) scale(1)' },
        {
          transform: `translate(${String(dx)}px, ${String(dy)}px) scale(${String(scaleX)}, ${String(scaleY)})`,
        },
      ],
      { duration: flight.durationMs, delay: flight.delayMs, easing: 'ease-in-out', fill: 'both' },
    );
    return () => {
      animation.cancel();
    };
  }, [flight]);
  return (
    <div
      ref={ref}
      className="flight"
      style={{ left: flight.from.left, top: flight.from.top }}
      aria-hidden="true"
    >
      <CardView face={flight.face} size="pile" width={flight.from.width} label="" />
    </div>
  );
}

/** Ebene über dem Tisch, auf der Karten von ihrem Start- zu ihrem Zielplatz fliegen. */
export function FlightLayer({ flights }: { readonly flights: readonly Flight[] }) {
  return (
    <>
      {flights.map((flight) => (
        <FlyingCard key={flight.id} flight={flight} />
      ))}
    </>
  );
}
