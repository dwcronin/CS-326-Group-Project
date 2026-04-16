// src/save/SaveService.ts

import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result.js";
import type { SavedEvent, SaveToggleResult, SaveError } from "./Save.js";
import type { SaveRepository } from "./SaveRepository.js";
import type { EventRepository } from "../events/EventRepository.js";
import type { Event } from "../events/Event.js";

export interface SavedEventWithEvent {
  savedRecord: SavedEvent;
  event: Event;
}

export class SaveService {
  constructor(
    private readonly saveRepo: SaveRepository,
    private readonly eventRepo: EventRepository,
  ) {}

  /**
   * toggleSaveEvent — Feature 14 contract method.
   *
   * Toggles the saved state for a user on an event:
   *   - If not saved: creates a new save record
   *   - If already saved: deletes the save record
   *
   * @param userId    The id of the acting user
   * @param userRole  Their role — only "user" (members) may save events
   * @param eventId   The event to save or unsave
   */
  async toggleSaveEvent(
    userId: string,
    userRole: "admin" | "staff" | "user",
    eventId: string,
  ): Promise<Result<SaveToggleResult, SaveError>> {
    if (userRole !== "user") {
      return Err({
        name: "UnauthorizedError",
        message: "Only members can save events.",
      } as const);
    }

    const event = await this.eventRepo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    if (event.status !== "published") {
      return Err({
        name: "EventNotSavableError",
        message: "Only published events can be saved.",
      } as const);
    }

    const existing = await this.saveRepo.findByEventAndUser(eventId, userId);

    if (existing) {
      await this.saveRepo.deleteById(existing.id);
      return Ok({ savedEvent: null, action: "unsaved" });
    }

    const newRecord = await this.saveRepo.save({
      id: randomUUID(),
      eventId,
      userId,
      createdAt: new Date(),
    });
    return Ok({ savedEvent: newRecord, action: "saved" });
  }

  /**
   * getSavedEvents — retrieves all events a member has saved, joined with event details.
   * Returns them sorted by save date descending (most recently saved first).
   *
   * @param userId    The id of the acting user
   * @param userRole  Their role — only "user" (members) have a saved list
   */
  async getSavedEvents(
    userId: string,
    userRole: "admin" | "staff" | "user",
  ): Promise<Result<SavedEventWithEvent[], SaveError>> {
    if (userRole !== "user") {
      return Err({
        name: "UnauthorizedError",
        message: "Only members have a saved events list.",
      } as const);
    }

    const savedRecords = await this.saveRepo.findAllByUser(userId);

    const pairs = await Promise.all(
      savedRecords.map(async (record) => ({
        record,
        event: await this.eventRepo.findById(record.eventId),
      })),
    );

    const hydrated: SavedEventWithEvent[] = pairs
      .filter((p): p is { record: SavedEvent; event: Event } => p.event !== null)
      .map((p) => ({ savedRecord: p.record, event: p.event }))
      .sort((a, b) => b.savedRecord.createdAt.getTime() - a.savedRecord.createdAt.getTime());

    return Ok(hydrated);
  }

  /**
   * getSavedEventIds — thin helper used by the event list route to know which
   * events the current user has already saved (for rendering button state).
   * Returns a plain array — no Result wrapper since this never fails meaningfully.
   */
  async getSavedEventIds(userId: string): Promise<string[]> {
    const records = await this.saveRepo.findAllByUser(userId);
    return records.map((r) => r.eventId);
  }
}
