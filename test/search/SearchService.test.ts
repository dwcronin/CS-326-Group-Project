import { SearchService } from "../../src/search/SearchService";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import type { Event } from "../../src/events/Event";

// Helper — lets each test override only the fields it cares about.
// startDatetime defaults to the future so events are treated as upcoming.
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

describe("SearchService", () => {
  let service: SearchService;

  beforeEach(() => {
    EventRepo._clearForTesting();
    service = new SearchService(EventRepo);
  });

  // ── filterEvents ────────────────────────────────────────────────

  describe("filterEvents", () => {
    it("returns only published upcoming events when query is empty", async () => {
      await EventRepo.save(makeEvent({ id: "e1", status: "published" }));
      await EventRepo.save(makeEvent({ id: "e2", status: "draft" }));
      await EventRepo.save(makeEvent({ id: "e3", status: "cancelled" }));

      const result = service.filterEvents([], await EventRepo.findAll());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
    });

    it("excludes past events even if status is published", async () => {
      await EventRepo.save(makeEvent({
        id: "past",
        status: "published",
        startDatetime: new Date("2020-01-01"),
        endDatetime:   new Date("2020-01-02"),
      }));

      const result = service.filterEvents([], await EventRepo.findAll());
      expect(result).toHaveLength(0);
    });

    it("returns events matching a single query token", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Jazz Festival" }));
      await EventRepo.save(makeEvent({ id: "e2", title: "Rock Concert" }));

      const result = service.filterEvents(["jazz"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
    });

    it("matches tokens case-insensitively", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "JAZZ FESTIVAL" }));

      const result = service.filterEvents(["jazz"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
    });

    it("matches tokens in description", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Party", description: "Live jazz music" }));

      const result = service.filterEvents(["jazz"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
    });

    it("matches tokens in location", async () => {
      await EventRepo.save(makeEvent({ id: "e1", location: "Jazz Park" }));

      const result = service.filterEvents(["jazz"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
    });

    it("matches tokens in category", async () => {
      await EventRepo.save(makeEvent({ id: "e1", category: "Jazz" }));

      const result = service.filterEvents(["jazz"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
    });

    it("requires ALL tokens to match (AND logic)", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Jazz Festival", location: "City Park" }));
      await EventRepo.save(makeEvent({ id: "e2", title: "Jazz Concert",  location: "Arena" }));

      const result = service.filterEvents(["jazz", "park"], await EventRepo.findAll());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
    });

    it("returns empty array when no events match the query", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Jazz Festival" }));

      const result = service.filterEvents(["rock"], await EventRepo.findAll());
      expect(result).toHaveLength(0);
    });

    it("sorts results by startDatetime ascending", async () => {
      await EventRepo.save(makeEvent({ id: "e2", startDatetime: new Date(Date.now() + 2 * 86_400_000) }));
      await EventRepo.save(makeEvent({ id: "e1", startDatetime: new Date(Date.now() + 1 * 86_400_000) }));

      const result = service.filterEvents([], await EventRepo.findAll());
      expect(result[0].id).toBe("e1");
      expect(result[1].id).toBe("e2");
    });
  });

  // ── searchEvents ────────────────────────────────────────────────

  describe("searchEvents", () => {
    it("returns all published upcoming events for an empty query", async () => {
      await EventRepo.save(makeEvent({ id: "e1" }));
      await EventRepo.save(makeEvent({ id: "e2", status: "draft" }));

      const result = await service.searchEvents("");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.events).toHaveLength(1);
        expect(result.value.query).toBe("");
      }
    });

    it("returns matching events for a non-empty query", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Music Night" }));
      await EventRepo.save(makeEvent({ id: "e2", title: "Art Show" }));

      const result = await service.searchEvents("music");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.events).toHaveLength(1);
    });

    it("returns an empty events array when no events match", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Jazz Festival" }));

      const result = await service.searchEvents("rock");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.events).toHaveLength(0);
    });

    it("returns InvalidSearchQueryError when query exceeds 200 characters", async () => {
      const result = await service.searchEvents("a".repeat(201));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.value.name).toBe("InvalidSearchQueryError");
    });

    it("accepts a query of exactly 200 characters", async () => {
      const result = await service.searchEvents("a".repeat(200));
      expect(result.ok).toBe(true);
    });

    it("trims whitespace from the query before matching", async () => {
      await EventRepo.save(makeEvent({ id: "e1", title: "Jazz Festival" }));

      const result = await service.searchEvents("  jazz  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.events).toHaveLength(1);
        expect(result.value.query).toBe("jazz");
      }
    });

    it("treats a whitespace-only query the same as empty (returns all events)", async () => {
      await EventRepo.save(makeEvent({ id: "e1" }));

      const result = await service.searchEvents("   ");
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.events).toHaveLength(1);
    });
  });
});
