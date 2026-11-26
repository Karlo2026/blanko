import { opponentOrder, seatPositions } from '../session/display.ts';
import { mainButton, tappableKeys } from '../session/interaction.ts';
import type { Table } from '../session/table.ts';
import { hintText, offlineText } from '../session/texts.ts';
import { FlightLayer } from './FlightLayer.tsx';
import { Opponent } from './Opponent.tsx';
import { OwnHand } from './OwnHand.tsx';
import { Piles } from './Piles.tsx';

interface RoundTableProps {
  readonly table: Table;
  /** Online: Plätze, deren Mensch gerade nicht verbunden ist. */
  readonly offline: ReadonlySet<number>;
}

/**
 * Eine Runde am Tisch: Gegner rundherum, Stapel in der Mitte, eigene Karten unten. Der Tisch ist
 * so gedreht, dass der eigene Platz unten liegt; ob die Züge lokal oder vom Server kommen, spielt
 * hier keine Rolle.
 */
export function RoundTable({ table, offline }: RoundTableProps) {
  const { view, legal, selection, names } = table;
  // Während Karten fliegen, ist nichts antippbar und der Knopf ausgeblendet.
  const tappable = table.busy ? new Set<string>() : tappableKeys(view, legal, selection);
  const button = table.busy ? null : mainButton(view, legal, selection);
  const opponents = opponentOrder(view.viewer, view.playerCount);
  const positions = seatPositions(opponents.length);
  const canKnock = legal.some((a) => a.type === 'knock');
  const status = [table.status, offlineText(names, view, offline)].filter((t) => t !== '');
  return (
    <>
      <div className="table">
        {opponents.map((player, index) => (
          <Opponent
            key={player}
            view={view}
            player={player}
            name={names[player] ?? '?'}
            position={positions[index] ?? 'top'}
            tappable={tappable}
            changed={table.changed}
            landing={table.landing}
            reveal={table.reveal}
            offline={offline.has(player)}
            onTap={table.tap}
          />
        ))}
        <div className="center">
          <Piles view={view} tappable={tappable} landing={table.landing} onTap={table.tap} />
        </div>
      </div>
      <div className="status" aria-live="polite">
        {status.join(' ')}
      </div>
      <div className="hint">{hintText(view, selection, names, canKnock)}</div>
      <OwnHand
        view={view}
        selection={selection}
        tappable={tappable}
        changed={table.changed}
        landing={table.landing}
        reveal={table.reveal}
        onTap={table.tap}
      />
      <div className="main-button-area">
        {button === 'knock' ? (
          <button type="button" className="main-button knock" onClick={table.knock}>
            Klopfen
          </button>
        ) : null}
        {button === 'cancel' ? (
          <button type="button" className="main-button" onClick={table.cancel}>
            Abbrechen
          </button>
        ) : null}
      </div>
      <FlightLayer flights={table.flights} />
    </>
  );
}
