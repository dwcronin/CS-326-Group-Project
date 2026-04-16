TypeScript
import { DEMO_USERS } from "../auth/InMemoryUserRepository";
import * as RsvpRepo from "../rsvp/InMemoryRsvpRepository";
import type {
  Event,
  EventAttendeeSummary,
  EventStatus,
  EventUpdateFields,
} from "./Event";
import type { EventRepository } from "./EventRepository";

const DEMO_EVENTS: Event[] = [
  {
    id: "event-draft-1",
    title: "Draft Planning Session",
    description: "Internal draft event for organizers.",
    location: "Room 201",
    category: "Planning",
    startDatetime: new Date("2026-05-01T18:00:00.000Z"),
    endDatetime: new Date("2026-05-01T19:00:00.000Z"),
    capacity: 25,
    organizerId: "user-staff",
    status: "draft",
    createdAt: new Date("2026-03-20T16:00:00.000Z"),
    updatedAt: new Date("2026-03-20T16:00:00.000Z"),
  },
  {
    id: "event-published-1",
    title: "Spring Showcase",
    description: "Open event for the whole community.",
    location: "Main Hall",
    category: "Showcase",
    startDatetime: new Date("2026-05-10T18:00:00.000Z"),
    endDatetime: new Date("2026-05-10T21:00:00.000Z"),
    capacity: 100,
    organizerId: "user-staff",
    status: "published",
    createdAt: new Date("2026-03-21T16:00:00.000Z"),
    updatedAt: new Date("2026-03-21T16:00:00.000Z"),
  },
  {
    id: "event-cancelled-1",
    title: "Cancelled Workshop",
    description: "Example cancelled event.",
    location: "Lab 3",
    category: "Workshop",
    startDatetime: new Date("2026-04-20T18:00:00.000Z"),
    endDatetime: new Date("2026-04-20T19:30:00.000Z"),
    organizerId: "user-admin",
    status: "cancelled",
    createdAt: new Date("2026-03-22T16:00:00.000Z"),
    updatedAt: new Date("2026-03-22T16:00:00.000Z"),
  },
];

class InMemoryEventRepository implements EventRepository {
  private events: Event[];

  constructor(events: Event[]) {
    this.events = events;
  }

  async findById(id: string): Promise<Event | null> {
    const match = this.events.find((event) => event.id === id);
    return match ? { ...match } : null;
  }

  async save(event: Event): Promise<Event> {
    const index = this.events.findIndex((e) => e.id === event.id);
    if (index !== -1) {
      this.events[index] = event;
    } else {
      this.events.push(event);
    }
    return event;
  }

  async update(id: string, fields: EventUpdateFields): Promise<Event | null> {
    const event = this.events.find((item) => item.id === id);
    if (!event) return null;
    Object.assign(event, { ...fields, updatedAt: new Date() });
    return { ...event };
  }

  async updateStatus(id: string, status: EventStatus): Promise<Event | null> {
    const event = this.events.find((item) => item.id === id);
    if (!event) return null;
    event.status = status;
    event.updatedAt = new Date();
    return { ...event };
  }

  async findAll(): Promise<Event[]> {
    return [...this.events];
  }

  async listAttendees(id: string): Promise<EventAttendeeSummary[]> {
    const rsvps = await RsvpRepo.listByEventId(id);
    return rsvps
      .filter((rsvp) => rsvp.status === "going" || rsvp.status === "waitlisted")
      .map((rsvp) => {
        const user = DEMO_USERS.find((candidate) => candidate.id === rsvp.userId);
        if (!user) return null;
        return {
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          rsvpId: rsvp.id,
          rsvpStatus: rsvp.status,
          rsvpCreatedAt: rsvp.createdAt,
        };
      })
      .filter((attendee): attendee is EventAttendeeSummary => attendee !== null);
  }

  clear(): void {
    this.events = [];
  }
}

const repo = new InMemoryEventRepository([...DEMO_EVENTS]);

export async function findById(id: string): Promise<Event | null> {
  return repo.findById(id);
}

export async function save(event: Event): Promise<Event> {
  return repo.save(event);
}

export async function update(id: string, fields: EventUpdateFields): Promise<Event | null> {
  return repo.update(id, fields);
}

export async function updateStatus(id: string, status: EventStatus): Promise<Event | null> {
  return repo.updateStatus(id, status);
}

export async function findAll(): Promise<Event[]> {
  return repo.findAll();
}

export async function listAttendees(id: string): Promise<EventAttendeeSummary[]> {
  return repo.listAttendees(id);
}

export function _clearForTesting(): void {
  repo.clear();
}