import { EventService } from "../../src/events/EventService";
import type { EventRepository } from "../../src/events/EventRepository";
import type { Event, EventAttendeeSummary } from "../../src/events/Event";

function makeRepo(): EventRepository {
  return {
    async save(event: Event): Promise<Event> {
      return event;
    },
    async findById(_id: string): Promise<Event | null> {
      return null;
    },
    async update(_id: string, _fields: Partial<Event>): Promise<Event | null> {
      return null;
    },
    async updateStatus(_id: string, _status: Event["status"]): Promise<Event | null> {
      return null;
    },
    async listAttendees(_id: string): Promise<EventAttendeeSummary[]> {
      return [];
    },
    async findAll(): Promise<Event[]> {
      return [];
    },
  };
}

describe("EventService.createEvent", () => {
  const baseInput = {
    title: "Test Event",
    description: "Description",
    location: "Campus",
    category: "Tech",
    startDatetime: new Date("2026-05-01T10:00:00Z"),
    endDatetime: new Date("2026-05-01T12:00:00Z"),
  };

  test("allows admin to create event", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", baseInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe("Test Event");
      expect(result.value.status).toBe("draft");
    }
  });

  test("allows staff to create event", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("staff1", "staff", baseInput);

    expect(result.ok).toBe(true);
  });

  test("rejects normal user", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("user1", "user", baseInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("NotAuthorisedError");
    }
  });

  test("rejects empty title", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      title: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidTitleError");
    }
  });

  test("rejects long title", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      title: "a".repeat(101),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidTitleError");
    }
  });

  test("rejects empty description", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      description: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidDescriptionError");
    }
  });

  test("rejects long description", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      description: "a".repeat(2001),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidDescriptionError");
    }
  });

  test("rejects invalid date", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      startDatetime: new Date("2026-05-02T10:00:00Z"),
      endDatetime: new Date("2026-05-01T10:00:00Z"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidDateError");
    }
  });

  test("rejects invalid capacity", async () => {
    const service = new EventService(makeRepo());
    const result = await service.createEvent("admin1", "admin", {
      ...baseInput,
      capacity: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.value.name).toBe("InvalidCapacityError");
    }
  });
});