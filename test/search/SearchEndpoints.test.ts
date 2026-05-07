// test/search/SearchEndpoints.test.ts
//
// SuperTest endpoint tests for Feature 10 (Event Search).
// Tests hit the real Express app with Prisma-backed repositories.
// TEST_EVENTS from test/setup.ts pre-loads:
//   - event-published-1: "Spring Showcase" (published, future)
//   - event-cancelled-1: "Cancelled Workshop" (cancelled)
//   - event-draft-1:     "Draft Planning Session" (draft)
// Only event-published-1 passes the published + upcoming filter.

import request from "supertest";
import { createComposedApp } from "../../src/composition";
import { seedTestData, cleanupTestData, disconnectPrisma } from "../setup";

// Log in and return the session cookie for subsequent requests.
async function loginAs(
  app: Express.Application,
  email: string,
): Promise<string[]> {
  const res = await request(app)
    .post("/login")
    .type("form")
    .send({ email, password: "password123" });
  return res.headers["set-cookie"] as string[];
}

// Express.Application is the type supertest accepts — avoid importing express directly.
type ExpressApp = Parameters<typeof request>[0];

describe("GET /events — search endpoints", () => {
  let app: ExpressApp;
  let userCookie: string[];
  let staffCookie: string[];

  beforeAll(async () => {
    await cleanupTestData();
    await seedTestData();
    app = createComposedApp().getExpressApp();
    userCookie  = await loginAs(app as Express.Application, "user@app.test");
    staffCookie = await loginAs(app as Express.Application, "staff@app.test");
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectPrisma();
  });

  // ── Authentication ─────────────────────────────────────────────

  it("redirects unauthenticated requests to /login", async () => {
    const res = await request(app).get("/events");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  // ── Happy path ─────────────────────────────────────────────────

  it("returns 200 and lists published upcoming events for an empty query", async () => {
    const res = await request(app).get("/events").set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Spring Showcase");
  });

  it("returns 200 and shows matching event for a valid search query", async () => {
    const res = await request(app)
      .get("/events?q=Spring")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Spring Showcase");
  });

  it("staff users can also search the event list", async () => {
    const res = await request(app).get("/events").set("Cookie", staffCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Spring Showcase");
  });

  // ── Domain errors ──────────────────────────────────────────────

  it("returns 422 for a query exceeding 200 characters", async () => {
    const longQuery = "a".repeat(201);
    const res = await request(app)
      .get(`/events?q=${longQuery}`)
      .set("Cookie", userCookie);
    expect(res.status).toBe(422);
  });

  // ── No-results case ────────────────────────────────────────────

  it("returns 200 with a no-results message for a non-matching query", async () => {
    const res = await request(app)
      .get("/events?q=zzznomatch")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("No events matched");
  });

  it("does not include cancelled events in search results", async () => {
    const res = await request(app)
      .get("/events?q=Cancelled")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("No events matched");
  });

  // ── Edge case: case-insensitive matching ───────────────────────

  it("matches events case-insensitively", async () => {
    const res = await request(app)
      .get("/events?q=spring")
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
    expect(res.text).toContain("Spring Showcase");
  });

  it("accepts a query of exactly 200 characters", async () => {
    const maxQuery = "a".repeat(200);
    const res = await request(app)
      .get(`/events?q=${maxQuery}`)
      .set("Cookie", userCookie);
    expect(res.status).toBe(200);
  });
});
