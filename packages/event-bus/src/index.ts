import type { BlinEvent, EventType } from './events.js';

export * from './events.js';

type EventHandler<T extends BlinEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish(event: BlinEvent): Promise<void>;
  subscribe<T extends BlinEvent>(type: EventType, handler: EventHandler<T>): void;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  async publish(event: BlinEvent): Promise<void> {
    console.log(`[event-bus] publish: ${event.type}`);
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(
      handlers.map(h =>
        Promise.resolve(h(event)).catch(err => {
          console.error(`[event-bus] handler error for ${event.type}:`, err);
        })
      )
    );
  }

  subscribe<T extends BlinEvent>(type: EventType, handler: EventHandler<T>): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler]);
  }
}
