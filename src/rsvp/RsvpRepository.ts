import type { Rsvp, RsvpStatus } from "./Rsvp";

/**
 * Storage interface for RSVPs.
 * Sprint 1 uses InMemoryRsvpRepository.
 * Sprint 3 swaps in a Prisma-backed module without changing anything above this layer.
 */
export interface RsvpRepository {
  listByEventId(eventId: string): Promise<Rsvp[]>;
  findByEventAndUser(eventId: string, userId: string): Promise<Rsvp | null>;
  findActiveByEvent(eventId: string): Promise<Rsvp[]>;
  save(rsvp: Rsvp): Promise<Rsvp>;
  updateStatus(id: string, status: RsvpStatus): Promise<Rsvp | null>;
}