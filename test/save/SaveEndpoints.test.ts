// test/save/SaveEndpoints.test.ts
//
// SuperTest endpoint tests for Feature 14 (Save for Later).
// Tests hit the real Express app with Prisma-backed repositories.
// TEST_EVENTS from test/setup.ts pre-loads:
//   - event-published-1:  "Spring Showcase"      (published, future)
//   - event-cancelled-1:  "Cancelled Workshop"   (cancelled)
//   - event-draft-1:      "Draft Planning Session" (draft)

import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { seedTestData, cleanupTestData, disconnectPrisma } from "../setup";
import * as SaveRepo from "../../src/save/InMemorySaveRepository";

type ExpressApp = Parameters<typeof request>[0];

async function loginAs(
  app: ExpressApp,
  email: string,
): Promise<string[]> {
  const res = await request(app)
    .post("/login")
    .type("form")
    .send({ email, password: "password123" });
  return res.headers["set-cookie"] as string[];
}

describe("POST /events/:id/save and GET /saved-events — save endpoints", () => {
  let app: ExpressApp;
  let userCookie:  string[];
  let staffCookie: string[];

  beforeAll(async () => {
    await cleanupTestData();
    await seedTestData();
    app = createComposedApp().getExpressApp();
    userCookie  = await loginAs(app, "user@app.test");
    staffCookie = await loginAs(app, "staff@app.test");
  });

  // Clear saves between tests so toggle state is predictable.
  beforeEach(() => {
    SaveRepo._clearForTesting();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  // ── Happy path ─────────────────────────────────────────────────

  it("returns 302 redirect to /events when a user saves a published event", async () => {
    const res = await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/events");
  });

  it("saves then unsaves an event on a second toggle", async () => {
    await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);

    // Second toggle — event should now be unsaved (still 302, back to /events)
    const res = await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/events");
  });

  // ── Domain errors ──────────────────────────────────────────────

  it("returns 404 for a non-existent event", async () => {
    const res = await request(app)
      .post("/events/does-not-exist/save")
      .type("form")
      .set("Cookie", userCookie);
    expect(res.status).toBe(404);
  });

  it("returns 422 when attempting to save a cancelled event", async () => {
    const res = await request(app)
      .post("/events/event-cancelled-1/save")
      .type("form")
      .set("Cookie", userCookie);
    expect(res.status).toBe(422);
  });

  it("returns 403 when a staff member tries to save an event", async () => {
    const res = await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(403);
  });

  // ── GET /saved-events ──────────────────────────────────────────

  it("returns 200 for an authenticated user with no saved events", async () => {
    const res = await request(app)
      .get("/saved-events")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
  });

  it("returns 403 for a staff member visiting /saved-events", async () => {
    const res = await request(app)
      .get("/saved-events")
      .set("Cookie", staffCookie);
    expect(res.status).toBe(403);
  });

  // ── Edge case: saved event appears on the saved list ──────────

  it("shows a saved event on the /saved-events page", async () => {
    await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);

    const res = await request(app)
      .get("/saved-events")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Spring Showcase");
  });

  it("does not show an unsaved event on the /saved-events page", async () => {
    // Save then immediately unsave
    await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);
    await request(app)
      .post("/events/event-published-1/save")
      .type("form")
      .set("Cookie", userCookie);

    const res = await request(app)
      .get("/saved-events")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain("Spring Showcase");
  });
});
