import request from "supertest";
import { createComposedApp } from "../../src/composition";
import * as EventRepo from "../../src/events/InMemoryEventRepository";

function app() {
  process.env.NODE_ENV = "test";
  return createComposedApp().getExpressApp();
}

async function loginAsAdmin(agent: request.Agent) {
  await agent
    .post("/login")
    .type("form")
    .send({
      email: "admin@app.test",
      password: "password123",
    })
    .expect(302);
}

async function loginAsUser(agent: request.Agent) {
  await agent
    .post("/login")
    .type("form")
    .send({
      email: "member@app.test",
      password: "password123",
    })
    .expect(302);
}

describe("Event routes Sprint 2 SuperTest coverage", () => {
  beforeEach(() => {
    EventRepo._clearForTesting();
  });

  test("GET /events/new allows admin to view event creation page", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent.get("/events/new").expect(200);

    expect(res.text).toContain("Create Event");
  });

  test("POST /events creates a draft event for admin", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent
      .post("/events")
      .type("form")
      .send({
        title: "Route Test Event",
        description: "Created through SuperTest",
        location: "Campus Center",
        category: "Tech",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        capacity: "25",
        intent: "draft",
      })
      .expect(302);

    expect(res.headers.location).toMatch(/^\/events\/.+\/edit$/);

    const events = await EventRepo.findAll();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Route Test Event");
    expect(events[0].status).toBe("draft");
  });

  test("POST /events can create and publish an event for admin", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    await agent
      .post("/events")
      .type("form")
      .send({
        title: "Published Route Event",
        description: "Published through SuperTest",
        location: "Main Hall",
        category: "Showcase",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        capacity: "50",
        intent: "publish",
      })
      .expect(302);

    const events = await EventRepo.findAll();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Published Route Event");
    expect(events[0].status).toBe("published");
  });

  test("POST /events rejects invalid creation input with status 422", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent
      .post("/events")
      .type("form")
      .send({
        title: "",
        description: "Missing title",
        location: "Campus",
        category: "Tech",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        capacity: "10",
        intent: "draft",
      })
      .expect(422);

    expect(res.text).toContain("Title cannot be empty");
  });

  test("POST /events rejects normal users with status 403", async () => {
    const agent = request.agent(app());
    await loginAsUser(agent);

    const res = await agent
      .post("/events")
      .type("form")
      .send({
        title: "User Event",
        description: "Should fail",
        location: "Campus",
        category: "Tech",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        intent: "draft",
      })
      .expect(403);

    expect(res.text).toContain("Only organizers can create events");
  });

  test("HTMX POST /events returns inline validation fragment", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent
      .post("/events")
      .set("HX-Request", "true")
      .type("form")
      .send({
        title: "",
        description: "Missing title",
        location: "Campus",
        category: "Tech",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        intent: "draft",
      })
      .expect(422);

    expect(res.text).toContain("Title cannot be empty");
    expect(res.text).toContain("hx-post=\"/events\"");
  });

  test("GET /events/:id shows published event details", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    await EventRepo.save({
      id: "published-event-1",
      title: "Published Detail Event",
      description: "Visible event",
      location: "Room 101",
      category: "Tech",
      startDatetime: new Date("2026-05-01T10:00:00Z"),
      endDatetime: new Date("2026-05-01T12:00:00Z"),
      capacity: 20,
      organizerId: "user-staff",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await agent.get("/events/published-event-1").expect(200);

    expect(res.text).toContain("Published Detail Event");
    expect(res.text).toContain("Visible event");
  });

  test("GET /events/:id returns 404 for missing event", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent.get("/events/missing-event").expect(404);

    expect(res.text).toContain("Event not found");
  });

  test("GET /events/:id hides draft event from unrelated normal user", async () => {
    const agent = request.agent(app());

    await EventRepo.save({
      id: "draft-event-1",
      title: "Draft Detail Event",
      description: "Hidden draft",
      location: "Room 202",
      category: "Planning",
      startDatetime: new Date("2026-05-01T10:00:00Z"),
      endDatetime: new Date("2026-05-01T12:00:00Z"),
      capacity: 20,
      organizerId: "user-staff",
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await loginAsUser(agent);

    const res = await agent.get("/events/draft-event-1").expect(404);

    expect(res.text).toContain("Event not found");
  });
});