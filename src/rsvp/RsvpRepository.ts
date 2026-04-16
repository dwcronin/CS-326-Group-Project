import type { Rsvp } from "./Rsvp";

export interface RsvpRepository {
  listByEventId(eventId: string): Promise<Rsvp[]>;
}
