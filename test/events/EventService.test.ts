import { EventService } from "../../src/events/EventService";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

// Helper to create a valid base event — lets each test override only what it needs
function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Test Event",
    description: "A test event description.",
    location: "Room 101",
    category: "Social",
    startDatetime: new Date("2026-06-01T18:00:00"),
    endDatetime:   new Date("2026-06-01T20:00:00"),
    capacity: 10,
    organizerId: "organizer-1",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("EventService", () => {
  let service: EventService;

  beforeEach(async () => {
    // Start each test with a clean store and a fresh service instance
    EventRepo._clearForTesting();
    service = new EventService(EventRepo);

    // Pre-load a base event so tests don't have to repeat this
    await EventRepo.save(makeEvent());
  });

  // ── getEventForEdit ────────────────────────────────────────────

  describe("getEventForEdit", () => {
    it("returns the event when an admin requests any event", async () => {
      const result = await service.getEventForEdit("anyone", "admin", "event-1");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe("event-1");
    });

    it("returns the event when the organizer requests their own event", async () => {
      const result = await service.getEventForEdit("organizer-1", "staff", "event-1");
      expect(result.ok).toBe(true);
    });

    it("returns NotAuthorisedError when a staff member requests someone else's event", async () => {
      const result = await service.getEventForEdit("other-staff", "staff", "event-1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
    });

    it("returns EventNotFoundError for a non-existent event", async () => {
      const result = await service.getEventForEdit("organizer-1", "staff", "does-not-exist");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("EventNotFoundError");
    });

    it("returns EventNotEditableError for a cancelled event", async () => {
      await EventRepo.save(makeEvent({ id: "event-2", status: "cancelled" }));
      const result = await service.getEventForEdit("organizer-1", "staff", "event-2");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("EventNotEditableError");
    });

    it("returns EventNotEditableError for a past event", async () => {
      await EventRepo.save(makeEvent({ id: "event-3", status: "past" }));
      const result = await service.getEventForEdit("organizer-1", "staff", "event-3");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("EventNotEditableError");
    });
  });

  // ── updateEvent ────────────────────────────────────────────────

  describe("updateEvent", () => {
    it("updates the title when the organizer submits a valid title", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        title: "Updated Title",
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe("Updated Title");
    });

    it("returns InvalidTitleError when title is empty", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        title: "   ",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidTitleError");
    });

    it("returns InvalidTitleError when title exceeds 100 characters", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        title: "a".repeat(101),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidTitleError");
    });

    it("returns InvalidDateError when end is before start", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        startDatetime: new Date("2026-06-01T20:00:00"),
        endDatetime:   new Date("2026-06-01T18:00:00"),
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidDateError");
    });

    it("returns InvalidCapacityError when capacity is zero", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        capacity: 0,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidCapacityError");
    });

    it("accepts undefined capacity meaning no limit", async () => {
      const result = await service.updateEvent("organizer-1", "staff", "event-1", {
        capacity: undefined,
      });
      expect(result.ok).toBe(true);
    });

    it("returns NotAuthorisedError when a non-organizer staff member tries to edit", async () => {
      const result = await service.updateEvent("other-staff", "staff", "event-1", {
        title: "Hijacked Title",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
    });

    it("allows an admin to edit any event", async () => {
      const result = await service.updateEvent("anyone", "admin", "event-1", {
        title: "Admin Edit",
      });
      expect(result.ok).toBe(true);
    });

    it("returns EventNotEditableError when editing a cancelled event", async () => {
      await EventRepo.save(makeEvent({ id: "event-2", status: "cancelled" }));
      const result = await service.updateEvent("organizer-1", "staff", "event-2", {
        title: "New Title",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("EventNotEditableError");
    });
  });
});