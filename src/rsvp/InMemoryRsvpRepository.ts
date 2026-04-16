import type { RsvpRepository } from "./RsvpRepository";
import type { Rsvp } from "./Rsvp";

const DEMO_RSVPS: Rsvp[] = [
  {
    id: "rsvp-1",
    eventId: "event-published-1",
    userId: "user-reader",
    status: "going",
    createdAt: new Date("2026-04-01T17:00:00.000Z"),
  },
  {
    id: "rsvp-2",
    eventId: "event-published-1",
    userId: "user-admin",
    status: "waitlisted",
    createdAt: new Date("2026-04-02T17:00:00.000Z"),
  },
  {
    id: "rsvp-3",
    eventId: "event-draft-1",
    userId: "user-reader",
    status: "cancelled",
    createdAt: new Date("2026-04-03T17:00:00.000Z"),
  },
];

class InMemoryRsvpRepository implements RsvpRepository {
  constructor(private readonly rsvps: Rsvp[]) {}

  async listByEventId(eventId: string): Promise<Rsvp[]> {
    return this.rsvps.filter((rsvp) => rsvp.eventId === eventId).map((rsvp) => ({ ...rsvp }));
  }
}

const repo = new InMemoryRsvpRepository([...DEMO_RSVPS]);

export async function listByEventId(eventId: string): Promise<Rsvp[]> {
  return repo.listByEventId(eventId);
}
