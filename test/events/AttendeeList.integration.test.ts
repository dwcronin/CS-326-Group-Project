import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { prisma } from "../../src/lib/prisma";
import type { Event } from "../../src/events/Event";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Attendee Test Event",
    description: "An event for testing the attendee list.",
    location: "Room 202",
    category: "Testing",
    startDatetime: new Date("2026-06-01T18:00:00.000Z"),
    endDatetime: new Date("2026-06-01T20:00:00.000Z"),
    capacity: 10,
    organizerId: "user-staff",
    status: "published",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    ...overrides,
  };
}

async function loginAs(
  email: string,
  agent: request.SuperAgentTest,
): Promise<void> {
  await agent
    .post("/login")
    .type("form")
    .send({ email, password: "password123" })
    .expect(302);
}

async function seedEvent(overrides: Partial<Event> = {}) {
  const e = makeEvent(overrides);
  await prisma.event.create({
    data: {
      id:            e.id,
      title:         e.title,
      description:   e.description,
      location:      e.location,
      category:      e.category,
      status:        e.status,
      capacity:      e.capacity ?? null,
      startDatetime: e.startDatetime,
      endDatetime:   e.endDatetime,
      organizerId:   e.organizerId,
    },
  });
}

async function seedRsvp(id: string, eventId: string, userId: string, status: string, createdAt: Date) {
  await prisma.rsvp.create({
    data: { id, eventId, userId, status, createdAt },
  });
}

describe("Feature 12 — Attendee List (Sprint 2)", () => {
  beforeEach(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
    await prisma.$disconnect();
  });

  describe("authorised access", () => {
    it("returns 200 for the organizer of the event", async () => {
      await seedEvent();
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(200);

      expect(res.text).toContain("Attendee List");
    });

    it("returns 200 for an admin viewing any event's attendees", async () => {
      await seedEvent({ organizerId: "user-staff" });
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("admin@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(200);

      expect(res.text).toContain("Attendee List");
    });

    it("returns the attendee list as an HTMX fragment (no <html> wrapper)", async () => {
      await seedEvent();
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent
        .get("/events/event-1/attendees")
        .set("HX-Request", "true")
        .expect(200);

      expect(res.text).not.toContain("<html");
    });
  });

  describe("unauthorised access", () => {
    it("returns 403 when a member (user role) requests the attendee list", async () => {
      await seedEvent();
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("user@app.test", agent);

      await agent.get("/events/event-1/attendees").expect(403);
    });

    it("returns 403 when a staff member who is not the organizer requests the list", async () => {
      await seedEvent({ organizerId: "user-admin" });
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(403);

      expect(res.text).toContain("Access denied.");
    });

    it("redirects unauthenticated visitors to /login", async () => {
      await seedEvent();
      const app = createComposedApp().getExpressApp();

      await request(app).get("/events/event-1/attendees").expect(302);
    });
  });

  describe("grouping and sorting", () => {
    it("lists going attendees before waitlisted attendees", async () => {
      await seedEvent();
      await seedRsvp("rsvp-waitlisted", "event-1", "user-admin", "waitlisted", new Date("2026-05-10T08:00:00.000Z"));
      await seedRsvp("rsvp-going", "event-1", "user-reader", "going", new Date("2026-05-10T09:00:00.000Z"));

      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(200);

      const goingIdx = res.text.indexOf("going");
      const waitlistedIdx = res.text.indexOf("waitlisted");
      expect(goingIdx).toBeLessThan(waitlistedIdx);
    });

    it("shows an empty-state message when no one has RSVPed", async () => {
      await seedEvent();
      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(200);

      expect(res.text).toContain("No active attendees yet.");
    });

    it("does not list cancelled RSVPs in the attendee table", async () => {
      await seedEvent();
      await seedRsvp("rsvp-cancelled", "event-1", "user-reader", "cancelled", new Date("2026-05-10T08:00:00.000Z"));

      const app = createComposedApp().getExpressApp();
      const agent = request.agent(app);
      await loginAs("staff@app.test", agent);

      const res = await agent.get("/events/event-1/attendees").expect(200);

      expect(res.text).toContain("No active attendees yet.");
    });
  });

  it("returns 404 when the event does not exist", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);
    await loginAs("admin@app.test", agent);

    await agent.get("/events/no-such-event/attendees").expect(404);
  });
});