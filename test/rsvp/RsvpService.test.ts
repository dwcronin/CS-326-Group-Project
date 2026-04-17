import { RsvpService } from "../../src/rsvp/RsvpService";
import * as RsvpRepo from "../../src/rsvp/InMemoryRsvpRepository";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Test Event",
    description: "A test event.",
    location: "Room 101",
    category: "Social",
    startDatetime: new Date("2026-06-01T18:00:00"),
    endDatetime:   new Date("2026-06-01T20:00:00"),
    capacity: 2,
    organizerId: "organizer-1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("RsvpService", () => {
  let service: RsvpService;

  beforeEach(async () => {
    EventRepo._clearForTesting();
    RsvpRepo._clearForTesting();
    service = new RsvpService(RsvpRepo, EventRepo);
    await EventRepo.save(makeEvent());
  });

  // ── Role checks ────────────────────────────────────────────────

  it("returns NotAuthorisedError when an admin tries to RSVP", async () => {
    const result = await service.toggleRsvp("admin-1", "admin", "event-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
  });

  it("returns NotAuthorisedError when a staff member tries to RSVP", async () => {
    const result = await service.toggleRsvp("organizer-1", "staff", "event-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
  });

  // ── Event state checks ─────────────────────────────────────────

  it("returns EventNotFoundError for a non-existent event", async () => {
    const result = await service.toggleRsvp("user-1", "user", "does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotFoundError");
  });

  it("returns EventNotRsvpableError for a cancelled event", async () => {
    await EventRepo.save(makeEvent({ id: "event-2", status: "cancelled" }));
    const result = await service.toggleRsvp("user-1", "user", "event-2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotRsvpableError");
  });

  it("returns EventNotRsvpableError for a draft event", async () => {
    await EventRepo.save(makeEvent({ id: "event-3", status: "draft" }));
    const result = await service.toggleRsvp("user-1", "user", "event-3");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotRsvpableError");
  });

  // ── Case 1: New RSVP ───────────────────────────────────────────

  it("creates a going RSVP when the event has capacity", async () => {
    const result = await service.toggleRsvp("user-1", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvp.status).toBe("going");
      expect(result.value.action).toBe("created-going");
    }
  });

  it("creates a waitlisted RSVP when the event is full", async () => {
    // Fill the event (capacity is 2)
    await service.toggleRsvp("user-1", "user", "event-1");
    await service.toggleRsvp("user-2", "user", "event-1");

    const result = await service.toggleRsvp("user-3", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvp.status).toBe("waitlisted");
      expect(result.value.action).toBe("created-waitlisted");
    }
  });

  it("creates a going RSVP when event has no capacity limit", async () => {
    await EventRepo.save(makeEvent({ id: "event-unlimited", capacity: undefined }));
    const result = await service.toggleRsvp("user-1", "user", "event-unlimited");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.rsvp.status).toBe("going");
  });

  // ── Case 2: Cancel existing RSVP ──────────────────────────────

  it("cancels an active going RSVP on second toggle", async () => {
    await service.toggleRsvp("user-1", "user", "event-1");
    const result = await service.toggleRsvp("user-1", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvp.status).toBe("cancelled");
      expect(result.value.action).toBe("cancelled");
    }
  });

  it("cancels a waitlisted RSVP on second toggle", async () => {
    await service.toggleRsvp("user-1", "user", "event-1");
    await service.toggleRsvp("user-2", "user", "event-1");
    await service.toggleRsvp("user-3", "user", "event-1"); // waitlisted

    const result = await service.toggleRsvp("user-3", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.action).toBe("cancelled");
  });

  // ── Case 3: Reactivate cancelled RSVP ─────────────────────────

  it("reactivates a cancelled RSVP as going when capacity is available", async () => {
    await service.toggleRsvp("user-1", "user", "event-1"); // going
    await service.toggleRsvp("user-1", "user", "event-1"); // cancelled
    const result = await service.toggleRsvp("user-1", "user", "event-1"); // reactivate
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvp.status).toBe("going");
      expect(result.value.action).toBe("reactivated-going");
    }
  });

  it("reactivates a cancelled RSVP as waitlisted when event is full", async () => {
    await service.toggleRsvp("user-1", "user", "event-1"); // going
    await service.toggleRsvp("user-1", "user", "event-1"); // cancelled
    await service.toggleRsvp("user-2", "user", "event-1"); // going
    await service.toggleRsvp("user-3", "user", "event-1"); // going — now full

    const result = await service.toggleRsvp("user-1", "user", "event-1"); // reactivate
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rsvp.status).toBe("waitlisted");
      expect(result.value.action).toBe("reactivated-waitlisted");
    }
  });

  // ── getRsvpStatus ──────────────────────────────────────────────

  it("returns null when user has no RSVP", async () => {
    const status = await service.getRsvpStatus("user-1", "event-1");
    expect(status).toBeNull();
  });

  it("returns going when user has an active going RSVP", async () => {
    await service.toggleRsvp("user-1", "user", "event-1");
    const status = await service.getRsvpStatus("user-1", "event-1");
    expect(status).toBe("going");
  });

  it("returns null after user cancels their RSVP", async () => {
    await service.toggleRsvp("user-1", "user", "event-1");
    await service.toggleRsvp("user-1", "user", "event-1");
    const status = await service.getRsvpStatus("user-1", "event-1");
    expect(status).toBeNull();
  });
});