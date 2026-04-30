import request from "supertest";
import type { Express } from "express";
import { createComposedApp } from "../../src/composition";
import { prisma } from "../../src/lib/prisma.js";
import * as EventRepo from "../../src/events/PrismaEventRepository";
import * as RsvpRepo from "../../src/rsvp/PrismaRsvpRepository";
import type { Event } from "../../src/events/Event";



// ── Helpers ───────────────────────────────────────────────────────

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
    organizerId: "user-staff",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Opens a session cookie for the given demo account.
// The starter demo users are defined in InMemoryUserRepository.ts —
// check that file to confirm the email addresses and passwords.
async function loginAs(
  agent: request.Agent,
  email: string,
  password = "password123",
): Promise<void> {
  await agent
    .post("/login")
    .type("form")
    .send({ email, password });
}

// ── Suite ─────────────────────────────────────────────────────────

describe("Event editing endpoints", () => {
  let expressApp: Express;
  let agent: request.Agent;

  beforeAll(() => {
    // Create the app once for the whole suite.
    // getExpressApp() returns the raw Express instance SuperTest needs.
    expressApp = createComposedApp().getExpressApp();
  });

  beforeEach(async () => {
    // Reset stores and re-seed before every test so tests are independent.
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
    await EventRepo.save(makeEvent());
    // Fresh agent per test so sessions never bleed between tests.
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
    await prisma.$disconnect();
  });

  // ── GET /events/:id/edit ───────────────────────────────────────

  describe("GET /events/:id/edit", () => {
    it("returns 200 and the edit form for the organizer", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent.get("/events/event-1/edit");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Edit Event");
      expect(res.text).toContain("Test Event");
    });

    it("returns 200 and the edit form for an admin", async () => {
      await loginAs(agent, "admin@app.test");
      const res = await agent.get("/events/event-1/edit");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Edit Event");
    });

    it("returns 403 when a member tries to access the edit form", async () => {
      await loginAs(agent, "user@app.test");
      const res = await agent.get("/events/event-1/edit");
      expect(res.status).toBe(403);
      expect(res.text).toContain("permission");
    });

    it("redirects to login when unauthenticated", async () => {
      const res = await request(expressApp).get("/events/event-1/edit");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/login");
    });

    it("returns 404 when the event does not exist", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent.get("/events/does-not-exist/edit");
      expect(res.status).toBe(404);
      expect(res.text).toContain("not found");
    });

    it("returns 403 when staff tries to edit an event they do not own", async () => {
      await EventRepo.save(makeEvent({
        id: "event-2",
        organizerId: "someone-else",
      }));
      await loginAs(agent, "staff@app.test");
      const res = await agent.get("/events/event-2/edit");
      expect(res.status).toBe(403);
    });

    it("returns 422 when the event is cancelled", async () => {
      await EventRepo.save(makeEvent({
        id: "event-cancelled",
        status: "cancelled",
      }));
      await loginAs(agent, "staff@app.test");
      const res = await agent.get("/events/event-cancelled/edit");
      expect(res.status).toBe(422);
      expect(res.text).toContain("cannot be edited");
    });

    it("returns 422 when the event is past", async () => {
      await EventRepo.save(makeEvent({ id: "event-past", status: "past" }));
      await loginAs(agent, "staff@app.test");
      const res = await agent.get("/events/event-past/edit");
      expect(res.status).toBe(422);
    });
  });

  // ── POST /events/:id/edit ──────────────────────────────────────

  describe("POST /events/:id/edit", () => {

    // ── Happy path ───────────────────────────────────────────────

    it("redirects on successful update (non-HTMX)", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({
          title: "Updated Title",
          description: "Updated description.",
        });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/events/event-1");
    });

    it("returns HX-Redirect header on successful update (HTMX)", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .set("HX-Request", "true")
        .type("form")
        .send({
          title: "Updated Title",
          description: "Updated description.",
        });
      expect(res.status).toBe(200);
      expect(res.headers["hx-redirect"]).toContain("/events/event-1");
    });

    it("persists the updated title in the repository", async () => {
      await loginAs(agent, "staff@app.test");
      await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({
          title: "Persisted Title",
          description: "Some description.",
        });
      const updated = await EventRepo.findById("event-1");
      expect(updated?.title).toBe("Persisted Title");
    });

    it("allows an admin to update any event", async () => {
      await loginAs(agent, "admin@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({
          title: "Admin Edit",
          description: "Admin changed this.",
        });
      expect(res.status).toBe(302);
    });

    // ── Validation errors ─────────────────────────────────────────

    it("returns 422 and re-renders the form when title is empty", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({ title: "   ", description: "Some description." });
      expect(res.status).toBe(422);
      expect(res.text).toContain("Title cannot be empty");
    });

    it("returns 422 when title exceeds 100 characters", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({ title: "a".repeat(101), description: "Some description." });
      expect(res.status).toBe(422);
      expect(res.text).toContain("100 characters");
    });

    it("returns 422 when end date is before start date", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({
          startDatetime: "2026-06-01T20:00",
          endDatetime:   "2026-06-01T18:00",
        });
      expect(res.status).toBe(422);
      expect(res.text).toContain("End date");
    });

    it("returns 422 when capacity is zero", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({ capacity: "0" });
      expect(res.status).toBe(422);
      expect(res.text).toContain("Capacity");
    });

    it("preserves the user typed values in the re-rendered form on error", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({
          title: "   ",
          description: "I typed this description.",
        });
      expect(res.status).toBe(422);
      expect(res.text).toContain("I typed this description.");
    });

    // ── Auth and permission errors ────────────────────────────────

    it("returns 401 when unauthenticated POST", async () => {
      const res = await request(expressApp)
        .post("/events/event-1/edit")
        .type("form")
        .send({ title: "Hack" });
      expect(res.status).toBe(401);
    });

    it("returns 403 when a member submits the edit form", async () => {
      await loginAs(agent, "user@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({ title: "Member Hack" });
      expect(res.status).toBe(403);
    });

    it("returns 403 when staff submits for an event they do not own", async () => {
      await EventRepo.save(makeEvent({
        id: "event-2",
        organizerId: "someone-else",
      }));
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-2/edit")
        .type("form")
        .send({ title: "Stolen Edit" });
      expect(res.status).toBe(403);
    });

    it("returns 422 when submitting to a cancelled event", async () => {
      await EventRepo.save(makeEvent({
        id: "event-cancelled",
        status: "cancelled",
      }));
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-cancelled/edit")
        .type("form")
        .send({ title: "Too Late" });
      expect(res.status).toBe(422);
    });

    // ── Edge case ─────────────────────────────────────────────────

    it("accepts an empty capacity string without error", async () => {
      await loginAs(agent, "staff@app.test");
      const res = await agent
        .post("/events/event-1/edit")
        .type("form")
        .send({ capacity: "" });
      expect(res.status).toBe(302);
      // Capacity is unchanged — empty string means "don't update it"
      const updated = await EventRepo.findById("event-1");
      expect(updated?.capacity).toBe(10);
    });
  });
});