import { EventService } from "../../src/events/EventService";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";
import * as RsvpRepo from "../../src/rsvp/InMemoryRsvpRepository";
import type { Rsvp } from "../../src/rsvp/Rsvp";

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

function makeRsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    id: "rsvp-1",
    eventId: "event-1",
    userId: "user-1",
    status: "going",
    createdAt: new Date("2026-04-01T17:00:00.000Z"),
    ...overrides,
  };
}

describe("EventService", () => {
  let service: EventService;

  beforeEach(async () => {
    // Start each test with a clean store and a fresh service instance
    EventRepo._clearForTesting();
    RsvpRepo._clearForTesting();
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

  describe("changeEventStatus", () => {
    it("publishes a draft event for the organizer", async () => {
      await EventRepo.save(makeEvent({ id: "event-draft", status: "draft" }));

      const result = await service.changeEventStatus(
        "organizer-1",
        "staff",
        "event-draft",
        "published",
      );

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.status).toBe("published");
    });

    it("returns InvalidEventStatusError for an unsupported transition", async () => {
      await EventRepo.save(makeEvent({ id: "event-draft", status: "draft" }));

      const result = await service.changeEventStatus(
        "organizer-1",
        "staff",
        "event-draft",
        "cancelled",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidEventStatusError");
    });

    it("returns NotAuthorisedError when another staff member changes status", async () => {
      await EventRepo.save(makeEvent({ id: "event-draft", status: "draft" }));

      const result = await service.changeEventStatus(
        "other-staff",
        "staff",
        "event-draft",
        "published",
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
    });
  });

  describe("listEventAttendees", () => {
    it("returns attendees sorted with going before waitlisted", async () => {
      await RsvpRepo.save(
        makeRsvp({
          id: "rsvp-going",
          eventId: "event-1",
          userId: "user-reader",
          status: "going",
          createdAt: new Date("2026-04-02T17:00:00.000Z"),
        }),
      );
      await RsvpRepo.save(
        makeRsvp({
          id: "rsvp-waitlisted",
          eventId: "event-1",
          userId: "user-admin",
          status: "waitlisted",
          createdAt: new Date("2026-04-01T17:00:00.000Z"),
        }),
      );

      const result = await service.listEventAttendees("organizer-1", "staff", "event-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].rsvpStatus).toBe("going");
        expect(result.value[1].rsvpStatus).toBe("waitlisted");
      }
    });

    it("returns NotAuthorisedError when a non-organizer staff member requests attendees", async () => {
      const result = await service.listEventAttendees("other-staff", "staff", "event-1");

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("NotAuthorisedError");
    });
  });
});
