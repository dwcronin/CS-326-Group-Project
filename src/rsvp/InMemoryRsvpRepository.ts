// src/rsvp/InMemoryRsvpRepository.ts

import { randomUUID } from "node:crypto";
import type { Rsvp, RsvpStatus } from "./Rsvp.js";

// Module-level store — nothing outside this file touches this directly
const store = new Map<string, Rsvp>();

export function findByEventAndUser(
  eventId: string,
  userId: string,
): Promise<Rsvp | null> {
  for (const rsvp of store.values()) {
    if (rsvp.eventId === eventId && rsvp.userId === userId) {
      return Promise.resolve(rsvp);
    }
  }
  return Promise.resolve(null);
}

/**
 * Returns all RSVPs for an event whose status is "going" or "waitlisted".
 * Sorted by createdAt ascending so waitlist order is stable.
 */
export function findActiveByEvent(eventId: string): Promise<Rsvp[]> {
  const active = Array.from(store.values())
    .filter(r => r.eventId === eventId && r.status !== "cancelled")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return Promise.resolve(active);
}