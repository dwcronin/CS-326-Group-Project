import request from "supertest";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { createComposedApp } from "../../src/composition";
import { PrismaClient } from "@prisma/client";
import * as EventRepo from "../../src/events/PrismaEventRepository";
import * as RsvpRepo from "../../src/rsvp/PrismaRsvpRepository";
import type { Event } from "../../src/events/Event";


// Prisma Client
const prisma = new PrismaClient();

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
    capacity: 2,
    organizerId: "user-staff",
    status: "published",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

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

describe("RSVP toggle endpoint", () => {
  let expressApp: Express;
  let agent: request.Agent;

  beforeAll(() => {
    expressApp = createComposedApp().getExpressApp();
  });

  beforeEach(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
    await EventRepo.save(makeEvent());
    agent = request.agent(expressApp);
  });

  afterAll(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
    await prisma.$disconnect();
  });

  // ── Happy path ───────────────────────────────────────────────────

  it("redirects on successful RSVP (non-HTMX)", async () => {
    await loginAs(agent, "user@app.test");
    const res = await agent.post("/events/event-1/rsvp");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/events/event-1");
  });

  it("returns the updated button partial on successful RSVP (HTMX)", async () => {
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(200);
    expect(res.text).toContain("rsvp-button-region");
    expect(res.text).toContain("Going");
  });

  it("shows waitlisted state when event is full (HTMX)", async () => {
    // Seed two going RSVPs directly to fill the capacity of 2
    // without needing two separate user accounts to log in
    await RsvpRepo.save({
      id: randomUUID(),
      eventId: "event-1",
      userId: "other-user-a",
      status: "going",
      createdAt: new Date(),
    });
    await RsvpRepo.save({
      id: randomUUID(),
      eventId: "event-1",
      userId: "other-user-b",
      status: "going",
      createdAt: new Date(),
    });

    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Waitlisted");
  });

  it("shows plain RSVP button after cancelling (HTMX)", async () => {
    await loginAs(agent, "user@app.test");
    // First toggle — creates RSVP
    await agent.post("/events/event-1/rsvp").set("HX-Request", "true");
    // Second toggle — cancels it
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(200);
    expect(res.text).toContain("rsvp-button-region");
    expect(res.text).not.toContain("Going");
    expect(res.text).not.toContain("Waitlisted");
  });

  it("reactivates a cancelled RSVP on third toggle (HTMX)", async () => {
    await loginAs(agent, "user@app.test");
    await agent.post("/events/event-1/rsvp").set("HX-Request", "true"); // going
    await agent.post("/events/event-1/rsvp").set("HX-Request", "true"); // cancelled
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");                                        // reactivated
    expect(res.status).toBe(200);
    expect(res.text).toContain("Going");
  });

  // ── Auth and role errors ──────────────────────────────────────────

  it("returns 401 when unauthenticated", async () => {
    const res = await request(expressApp).post("/events/event-1/rsvp");
    expect(res.status).toBe(401);
  });

  it("returns 403 when an admin tries to RSVP", async () => {
    await loginAs(agent, "admin@app.test");
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(403);
    expect(res.text).toContain("Organizers and admins cannot RSVP");
  });

  it("returns 403 when a staff member tries to RSVP", async () => {
    await loginAs(agent, "staff@app.test");
    const res = await agent
      .post("/events/event-1/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(403);
  });

  // ── Event state errors ────────────────────────────────────────────

  it("returns 404 when the event does not exist", async () => {
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/does-not-exist/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(404);
    expect(res.text).toContain("not found");
  });

  it("returns 422 when the event is cancelled", async () => {
    await EventRepo.save(makeEvent({
      id: "event-cancelled",
      status: "cancelled",
    }));
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-cancelled/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(422);
    expect(res.text).toContain("not accepting RSVPs");
  });

  it("returns 422 when the event is a draft", async () => {
    await EventRepo.save(makeEvent({
      id: "event-draft",
      status: "draft",
    }));
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-draft/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(422);
  });

  it("returns 422 when the event is past", async () => {
    await EventRepo.save(makeEvent({
      id: "event-past",
      status: "past",
    }));
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-past/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(422);
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it("allows RSVPing to an event with no capacity limit", async () => {
    await EventRepo.save(makeEvent({
      id: "event-unlimited",
      capacity: undefined,
    }));
    await loginAs(agent, "user@app.test");
    const res = await agent
      .post("/events/event-unlimited/rsvp")
      .set("HX-Request", "true");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Going");
  });
});