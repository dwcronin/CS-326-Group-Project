import { randomUUID } from "node:crypto";
import type { RsvpRepository } from "./RsvpRepository";
import type { Rsvp, RsvpStatus } from "./Rsvp";

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
  private rsvps: Rsvp[];

  constructor(rsvps: Rsvp[]) {
    this.rsvps = rsvps;
  }

  async listByEventId(eventId: string): Promise<Rsvp[]> {
    return this.rsvps.filter((rsvp) => rsvp.eventId === eventId).map((rsvp) => ({ ...rsvp }));
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null> {
    const match = this.rsvps.find(r => r.eventId === eventId && r.userId === userId);
    return match ? { ...match } : null;
  }

  async findActiveByEvent(eventId: string): Promise<Rsvp[]> {
    return this.rsvps
      .filter(r => r.eventId === eventId && r.status !== "cancelled")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async save(rsvp: Rsvp): Promise<Rsvp> {
    const index = this.rsvps.findIndex(r => r.id === rsvp.id);
    if (index !== -1) {
      this.rsvps[index] = rsvp;
    } else {
      this.rsvps.push(rsvp);
    }
    return rsvp;
  }

  async updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null> {
    const rsvp = this.rsvps.find(r => r.id === id);
    if (!rsvp) return null;
    rsvp.status = status;
    return { ...rsvp };
  }

  clear(): void {
    this.rsvps = [];
  }
}

const repo = new InMemoryRsvpRepository([...DEMO_RSVPS]);

export async function listByEventId(eventId: string): Promise<Rsvp[]> {
  return repo.listByEventId(eventId);
}

export async function findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null> {
  return repo.findByEventAndUser(eventId, userId);
}

export async function findActiveByEvent(eventId: string): Promise<Rsvp[]> {
  return repo.findActiveByEvent(eventId);
}

export async function save(rsvp: Rsvp): Promise<Rsvp> {
  return repo.save(rsvp);
}

export async function updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null> {
  return repo.updateStatus(id, status);
}

export function _clearForTesting(): void {
  repo.clear();
}