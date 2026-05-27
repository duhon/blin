import { EventEmitter } from 'events';
import type { BlinEvent, EventType } from './events.js';

export * from './events.js';

type EventHandler<T extends BlinEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish(event: BlinEvent): Promise<void>;
  subscribe<T extends BlinEvent>(type: EventType, handler: EventHandler<T>): void;
}

export class InMemoryEventBus implements IEventBus {
  private emitter = new EventEmitter();

  async publish(event: BlinEvent): Promise<void> {
    console.log(`[event-bus] publish: ${event.type}`);
    this.emitter.emit(event.type, event);
  }

  subscribe<T extends BlinEvent>(type: EventType, handler: EventHandler<T>): void {
    this.emitter.on(type, (event: T) => {
      Promise.resolve(handler(event)).catch((err) => {
        console.error(`[event-bus] handler error for ${type}:`, err);
      });
    });
  }
}
