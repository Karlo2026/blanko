import {
  CLOSE_NO_RETRY,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@blanko/protocol';
import { retryDelay, type Entry } from './online.ts';

/**
 * Zustand der Leitung: baut auf, Server wird (vermutlich) geweckt, offen, unterbrochen und
 * verbindet neu, endgültig beendet.
 */
export type LinkState = 'connecting' | 'waking' | 'open' | 'lost' | 'closed';

/** Hält die Leitung offen, auch hinter Proxys, die stille Verbindungen kappen. */
const PING_MS = 25_000;
/** Dauert die erste Verbindung länger, schläft der Server vermutlich (Gratis-Hosting). */
const WAKE_HINT_MS = 3000;

/**
 * WebSocket zum Mehrspieler-Server mit automatischem Wiederverbinden. Nach jedem Aufbau meldet sie
 * sich mit `entry` an; sobald ein Platz feststeht, ist das ein resume auf genau diesen Platz.
 */
export class Connection {
  private readonly url: string;
  private entry: Entry;
  private socket: WebSocket | null = null;
  private running = false;
  private everOpen = false;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private wakeTimer: ReturnType<typeof setTimeout> | undefined;
  private pingTimer: ReturnType<typeof setInterval> | undefined;
  private readonly listeners = new Set<(message: ServerMessage) => void>();
  private readonly stateListeners = new Set<(state: LinkState) => void>();

  constructor(url: string, entry: Entry) {
    this.url = url;
    this.entry = entry;
  }

  /** Nach dem Wiederverbinden zurück auf diesen Platz. */
  rejoinWith(entry: Entry): void {
    this.entry = entry;
  }

  subscribe(listener: (message: ServerMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onState(listener: (state: LinkState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  start(): void {
    this.running = true;
    this.attempt = 0;
    this.setState('connecting');
    if (!this.everOpen) {
      this.wakeTimer = setTimeout(() => {
        this.setState('waking');
      }, WAKE_HINT_MS);
    }
    this.connect();
  }

  stop(): void {
    this.running = false;
    clearTimeout(this.retryTimer);
    clearTimeout(this.wakeTimer);
    clearInterval(this.pingTimer);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }

  /** Verschickt eine Nachricht; ohne offene Leitung geht sie verloren, das resume holt den Stand. */
  send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  private setState(state: LinkState): void {
    for (const listener of this.stateListeners) listener(state);
  }

  private connect(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.everOpen = true;
      clearTimeout(this.wakeTimer);
      this.setState('open');
      socket.send(JSON.stringify(this.entry));
      this.pingTimer = setInterval(() => {
        this.send({ type: 'ping' });
      }, PING_MS);
    };
    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      let message: ServerMessage;
      try {
        message = parseServerMessage(JSON.parse(event.data));
      } catch {
        return;
      }
      for (const listener of this.listeners) listener(message);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      clearInterval(this.pingTimer);
      if (!this.running) return;
      if (event.code === CLOSE_NO_RETRY) {
        this.running = false;
        this.setState('closed');
        return;
      }
      if (this.everOpen) this.setState('lost');
      this.retryTimer = setTimeout(() => {
        this.connect();
      }, retryDelay(this.attempt++));
    };
  }
}
