// src/events/EventRepository.ts

import type {
  Event,
  EventUpdateFields,
  EventStatus,
  EventAttendeeSummary,
} from "./Event";

/**
 * Storage interface for events.
 * Sprint 1 uses InMemoryEventRepository.
 * Sprint 3 swaps in a Prisma-backed implementation without changing anything above this layer.
 */
export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  save(event: Event): Promise<Event>;
  update(id: string, fields: EventUpdateFields): Promise<Event | null>;
  updateStatus(eventId: string, nextStatus: EventStatus): Promise<Event | null>;
  listAttendees(eventId: string): Promise<EventAttendeeSummary[]>;
  findAll(): Promise<Event[]>;
}