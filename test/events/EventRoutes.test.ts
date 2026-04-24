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

describe("Event creation routes Sprint 2 SuperTest coverage", () => {
  beforeEach(() => {
    EventRepo._clearForTesting();
  });

  test("GET /events/new allows admin to view event creation page", async () => {
    const agent = request.agent(app());
    await loginAsAdmin(agent);

    const res = await agent.get("/events/new").expect(200);

    expect(res.text).toContain("Create Event");
  });

  test("GET /events/new redirects unauthenticated users to login", async () => {
    const agent = request.agent(app());

    const res = await agent.get("/events/new").expect(302);

    expect(res.headers.location).toBe("/login");
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

  test("POST /events rejects unauthenticated form submissions with status 401", async () => {
    const agent = request.agent(app());

    const res = await agent
      .post("/events")
      .type("form")
      .send({
        title: "Blocked Event",
        description: "Should fail",
        location: "Campus",
        category: "Tech",
        startDatetime: "2026-05-01T10:00",
        endDatetime: "2026-05-01T12:00",
        intent: "draft",
      })
      .expect(401);

    expect(res.text).toContain("Please log in to continue");
  });
});