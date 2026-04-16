import type {
  Event,
  EventAttendeeSummary,
  EventStatus,
  EventUpdateFields,
} from "./Event";

export interface EventRepository {
  findById(id: string): Promise<Event | null>;
  update(id: string, fields: EventUpdateFields): Promise<Event | null>;
  updateStatus(id: string, status: EventStatus): Promise<Event | null>;
  listAttendees(id: string): Promise<EventAttendeeSummary[]>;
}
