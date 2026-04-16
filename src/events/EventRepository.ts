// src/events/EventRepository.ts

import { Event, EventUpdateFields } from "./Event";

/**
 * Storage interface for events.
 * Sprint 1 uses InMemoryEventRepository.
 * Sprint 3 swaps in a Prisma-backed implementation without changing anything above this layer.
 */
export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;
  update(id: string, fields: EventUpdateFields): Promise<Event | null>;
  findAll(): Promise<Event[]>;
}