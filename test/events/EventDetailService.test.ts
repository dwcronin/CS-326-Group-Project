import { EventService } from "../../src/events/EventService";
import type { EventRepository } from "../../src/events/EventRepository";
import type { Event } from "../../src/events/Event";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Sample Event",
    description: "Description",
    location: "Campus Center",
    category: "Tech",
    startDatetime: new Date("2026-05-01T10:00:00.000Z"),
    endDatetime: new Date("2026-05-01T12:00:00.000Z"),
    organizerId: "staff-1",
    status: "published",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
    ...overrides,
  };
}

function makeRepo(event: Event | null): EventRepository {
  return {
    async findById() {
      return event;
    },
    async save(e) {
      return e;
    },
    async update() {
      return event;
    },
    async updateStatus() {
      return event;
    },
    async listAttendees() {
      return [];
    },
    async findAll() {
      return event ? [event] : [];
    },
  };
}

describe("EventService.getEventForView", () => {
  test("returns published event to normal user", async () => {
    const repo = makeRepo(makeEvent({ status: "published" }));
    const service = new EventService(repo);

    const result = await service.getEventForView("user-1", "user", "event-1");

    expect(result.ok).toBe(true);
  });

  test("returns not found for missing event", async () => {
    const repo = makeRepo(null);
    const service = new EventService(repo);

    const result = await service.getEventForView("user-1", "user", "missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });

  test("allows organizer to view draft event", async () => {
    const repo = makeRepo(makeEvent({ status: "draft", organizerId: "staff-1" }));
    const service = new EventService(repo);

    const result = await service.getEventForView("staff-1", "staff", "event-1");

    expect(result.ok).toBe(true);
  });

  test("allows admin to view draft event", async () => {
    const repo = makeRepo(makeEvent({ status: "draft", organizerId: "staff-1" }));
    const service = new EventService(repo);

    const result = await service.getEventForView("admin-1", "admin", "event-1");

    expect(result.ok).toBe(true);
  });

  test("hides draft event from unrelated normal user", async () => {
    const repo = makeRepo(makeEvent({ status: "draft", organizerId: "staff-1" }));
    const service = new EventService(repo);

    const result = await service.getEventForView("user-2", "user", "event-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("EventNotFoundError");
    }
  });
});