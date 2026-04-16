import type { Event } from "./Event";
import type { IEventRepository } from "./EventRepository";

class InMemoryEventRepository implements IEventRepository {
  private readonly events = new Map<string, Event>();

  constructor(seedEvents: Event[] = []) {
    for (const event of seedEvents) {
      this.events.set(event.id, event);
    }
  }

  async create(event: Event): Promise<Event> {
    this.events.set(event.id, event);
    return event;
  }

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null;
  }

  async listAll(): Promise<Event[]> {
    return Array.from(this.events.values());
  }
}

export function CreateInMemoryEventRepository(
  seedEvents: Event[] = [],
): IEventRepository {
  return new InMemoryEventRepository(seedEvents);
}