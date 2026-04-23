import request from "supertest";
import { createComposedApp } from "../../src/composition";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import * as RsvpRepo from "../../src/rsvp/InMemoryRsvpRepository";
import type { Event } from "../../src/events/Event";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    title: "Lifecycle Test Event",
    description: "Lifecycle test event description.",
    location: "Room 101",
    category: "Testing",
    startDatetime: new Date("2026-06-01T18:00:00.000Z"),
    endDatetime: new Date("2026-06-01T20:00:00.000Z"),
    capacity: 20,
    organizerId: "user-staff",
    status: "draft",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    updatedAt: new Date("2026-05-01T10:00:00.000Z"),
    ...overrides,
  };
}

async function loginAs(email: string, agent: request.SuperAgentTest): Promise<void> {
  await agent
    .post("/login")
    .type("form")
    .send({ email, password: "password123" })
    .expect(302);
}

describe("Event lifecycle integration", () => {
  beforeEach(async () => {
    EventRepo._clearForTesting();
    RsvpRepo._clearForTesting();

    await EventRepo.save(makeEvent({ id: "event-draft-1", status: "draft" }));
    await EventRepo.save(makeEvent({ id: "event-published-1", status: "published" }));
    await EventRepo.save(makeEvent({
      id: "event-admin-owned-1",
      organizerId: "user-admin",
      status: "published",
    }));
  });

  it("publishes a draft event inline for the organizer", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);
    await loginAs("staff@app.test", agent);

    const response = await agent
      .post("/events/event-draft-1/status")
      .set("HX-Request", "true")
      .type("form")
      .send({ status: "published" })
      .expect(200);

    expect(response.text).toContain('id="event-lifecycle-panel"');
    expect(response.text).toContain("Status: published");
    expect(response.text).toContain("Cancel Event");
    expect(response.text).not.toContain("<html");
  });

  it("lets an admin cancel another organizer's published event inline", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);
    await loginAs("admin@app.test", agent);

    const response = await agent
      .post("/events/event-published-1/status")
      .set("HX-Request", "true")
      .type("form")
      .send({ status: "cancelled" })
      .expect(200);

    expect(response.text).toContain("Status: cancelled");
    expect(response.text).not.toContain("Cancel Event");
  });

  it("returns a 422 fragment for an invalid transition", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);
    await loginAs("staff@app.test", agent);

    const response = await agent
      .post("/events/event-published-1/status")
      .set("HX-Request", "true")
      .type("form")
      .send({ status: "published" })
      .expect(422);

    expect(response.text).toContain('id="event-lifecycle-panel"');
    expect(response.text).toContain("Invalid status transition.");
    expect(response.text).toContain("Status: published");
  });

  it("returns 403 when a member tries to change event status", async () => {
    const app = createComposedApp().getExpressApp();
    const agent = request.agent(app);
    await loginAs("user@app.test", agent);

    const response = await agent
      .post("/events/event-published-1/status")
      .set("HX-Request", "true")
      .type("form")
      .send({ status: "cancelled" })
      .expect(403);

    expect(response.text).toContain("You do not have permission to change event status.");
  });
});
