import { SaveService } from "../../src/save/SaveService";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import * as SaveRepo from "../../src/save/InMemorySaveRepository";
import type { Event } from "../../src/events/Event";

// Helper — lets each test override only the fields it cares about.
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Test Event",
    description: "A test event description.",
    location: "Room 101",
    category: "Social",
    startDatetime: new Date(Date.now() + 86_400_000),   // tomorrow
    endDatetime:   new Date(Date.now() + 172_800_000),  // day after tomorrow
    capacity: 10,
    organizerId: "organizer-1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("SaveService", () => {
  let service: SaveService;

  beforeEach(async () => {
    EventRepo._clearForTesting();
    SaveRepo._clearForTesting();
    service = new SaveService(SaveRepo, EventRepo);
    await EventRepo.save(makeEvent());
  });

  // ── toggleSaveEvent — role checks ──────────────────────────────

  it("returns UnauthorizedError when a staff member tries to save", async () => {
    const result = await service.toggleSaveEvent("staff-1", "staff", "event-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("UnauthorizedError");
  });

  it("returns UnauthorizedError when an admin tries to save", async () => {
    const result = await service.toggleSaveEvent("admin-1", "admin", "event-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("UnauthorizedError");
  });

  // ── toggleSaveEvent — event checks ─────────────────────────────

  it("returns EventNotFoundError when the event does not exist", async () => {
    const result = await service.toggleSaveEvent("user-1", "user", "does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotFoundError");
  });

  it("returns EventNotSavableError for a cancelled event", async () => {
    await EventRepo.save(makeEvent({ id: "cancelled-event", status: "cancelled" }));
    const result = await service.toggleSaveEvent("user-1", "user", "cancelled-event");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotSavableError");
  });

  it("returns EventNotSavableError for a draft event", async () => {
    await EventRepo.save(makeEvent({ id: "draft-event", status: "draft" }));
    const result = await service.toggleSaveEvent("user-1", "user", "draft-event");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotSavableError");
  });

  it("returns EventNotSavableError for a past event", async () => {
    await EventRepo.save(makeEvent({ id: "past-event", status: "past" }));
    const result = await service.toggleSaveEvent("user-1", "user", "past-event");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("EventNotSavableError");
  });

  // ── toggleSaveEvent — toggle logic ─────────────────────────────

  it("saves an event and returns action 'saved'", async () => {
    const result = await service.toggleSaveEvent("user-1", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe("saved");
      expect(result.value.savedEvent).not.toBeNull();
      expect(result.value.savedEvent?.eventId).toBe("event-1");
    }
  });

  it("unsaves an already-saved event and returns action 'unsaved'", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    const result = await service.toggleSaveEvent("user-1", "user", "event-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.action).toBe("unsaved");
      expect(result.value.savedEvent).toBeNull();
    }
  });

  it("does not create duplicate records — toggling twice leaves the event unsaved", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    await service.toggleSaveEvent("user-1", "user", "event-1");
    const ids = await service.getSavedEventIds("user-1");
    expect(ids).toHaveLength(0);
  });

  it("saves independently for different users on the same event", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    await service.toggleSaveEvent("user-2", "user", "event-1");
    const ids1 = await service.getSavedEventIds("user-1");
    const ids2 = await service.getSavedEventIds("user-2");
    expect(ids1).toHaveLength(1);
    expect(ids2).toHaveLength(1);
  });

  // ── getSavedEvents ──────────────────────────────────────────────

  it("returns UnauthorizedError for staff role", async () => {
    const result = await service.getSavedEvents("staff-1", "staff");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("UnauthorizedError");
  });

  it("returns UnauthorizedError for admin role", async () => {
    const result = await service.getSavedEvents("admin-1", "admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.value.name).toBe("UnauthorizedError");
  });

  it("returns an empty list when the user has saved nothing", async () => {
    const result = await service.getSavedEvents("user-1", "user");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(0);
  });

  it("returns only events saved by the given user", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    const result = await service.getSavedEvents("user-2", "user");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(0);
  });

  it("returns saved events with full event details hydrated", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    const result = await service.getSavedEvents("user-1", "user");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].event.id).toBe("event-1");
      expect(result.value[0].savedRecord.userId).toBe("user-1");
    }
  });

  it("returns saved events sorted by createdAt descending (most recent first)", async () => {
    await EventRepo.save(makeEvent({ id: "e2", title: "Event 2" }));
    await service.toggleSaveEvent("user-1", "user", "event-1");
    // Small delay so the two save records get distinct timestamps
    await new Promise((r) => setTimeout(r, 10));
    await service.toggleSaveEvent("user-1", "user", "e2");

    const result = await service.getSavedEvents("user-1", "user");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].event.id).toBe("e2");
      expect(result.value[1].event.id).toBe("event-1");
    }
  });

  // ── getSavedEventIds ────────────────────────────────────────────

  it("returns an array of saved event IDs for a user", async () => {
    await service.toggleSaveEvent("user-1", "user", "event-1");
    const ids = await service.getSavedEventIds("user-1");
    expect(ids).toContain("event-1");
    expect(ids).toHaveLength(1);
  });

  it("returns an empty array when the user has no saved events", async () => {
    const ids = await service.getSavedEventIds("user-1");
    expect(ids).toHaveLength(0);
  });
});
