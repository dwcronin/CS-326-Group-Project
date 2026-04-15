// src/rsvp/RsvpService.ts

import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result.js";
import type { RsvpToggleResult, RsvpError } from "./Rsvp.js";
import type { RsvpRepository } from "./RsvpRepository.js";
import type { EventRepository } from "../events/EventRepository.js";

export class RsvpService {
  constructor(
    private readonly rsvpRepo: RsvpRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  /**
   * toggleRsvp — Feature 4 contract method.
   *
   * Handles three cases:
   *   1. No existing RSVP — create one (going or waitlisted depending on capacity)
   *   2. Existing active RSVP (going or waitlisted) — cancel it
   *   3. Existing cancelled RSVP — reactivate it (going or waitlisted depending on capacity)
   *
   * @param actingUserId   The id of the user toggling their RSVP
   * @param actingUserRole Their role — only "user" (members) may RSVP
   * @param eventId        The event to RSVP to
   */
  async toggleRsvp(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string,
  ): Promise<Result<RsvpToggleResult, RsvpError>> {

    // Step 1: Only members may RSVP. Organizers and admins are rejected.
    if (actingUserRole !== "user") {
      return Err({
        name: "NotAuthorisedError",
        message: "Organizers and admins cannot RSVP to events.",
      } as const);
    }

    // Step 2: Does the event exist?
    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    // Step 3: Is the event in a state that allows RSVPs?
    // Only published events accept RSVPs.
    if (event.status !== "published") {
      return Err({
        name: "EventNotRsvpableError",
        message: "This event is not accepting RSVPs.",
      } as const);
    }

    // Step 4: Look up any existing RSVP for this user on this event.
    const existing = await this.rsvpRepo.findByEventAndUser(eventId, actingUserId);

    // Step 5: Handle the three toggle cases.

    // Case 2: Existing active RSVP — cancel it
    if (existing && existing.status !== "cancelled") {
      const updated = await this.rsvpRepo.updateStatus(existing.id, "cancelled");
      if (!updated) {
        return Err({ name: "EventNotFoundError", message: "RSVP could not be updated." } as const);
      }
      return Ok({ rsvp: updated, action: "cancelled" });
    }

    // For new RSVPs and reactivations, we need to know if the event is full.
    // Count current "going" attendees only — waitlisted don't take a spot.
    const activeRsvps = await this.rsvpRepo.findActiveByEvent(eventId);
    const goingCount = activeRsvps.filter(r => r.status === "going").length;
    const isFull = event.capacity !== undefined && goingCount >= event.capacity;

    // Case 1: No existing RSVP — create a new one
    if (!existing) {
      const newRsvp = await this.rsvpRepo.save({
        id: randomUUID(),
        eventId,
        userId: actingUserId,
        status: isFull ? "waitlisted" : "going",
        createdAt: new Date(),
      });
      return Ok({
        rsvp: newRsvp,
        action: isFull ? "created-waitlisted" : "created-going",
      });
    }

    // Case 3: Existing cancelled RSVP — reactivate it
    const newStatus = isFull ? "waitlisted" : "going";
    const reactivated = await this.rsvpRepo.updateStatus(existing.id, newStatus);
    if (!reactivated) {
      return Err({ name: "EventNotFoundError", message: "RSVP could not be reactivated." } as const);
    }
    return Ok({
      rsvp: reactivated,
      action: isFull ? "reactivated-waitlisted" : "reactivated-going",
    });
  }

  /**
   * getRsvpStatus — fetches the current RSVP status for a user on an event.
   * Used to render the button state on the event detail page.
   * Returns null if the user has no RSVP or their RSVP is cancelled.
   */
  async getRsvpStatus(
    userId: string,
    eventId: string,
  ): Promise<"going" | "waitlisted" | null> {
    const rsvp = await this.rsvpRepo.findByEventAndUser(eventId, userId);
    if (!rsvp || rsvp.status === "cancelled") return null;
    return rsvp.status;
  }
}