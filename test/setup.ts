// test/setup.ts
//
// Jest setup file that configures the test database and provides helpers
// for seeding and cleaning up Prisma data between tests.

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Point tests to a separate test database
process.env.DATABASE_URL = "file:./prisma/test.db";

const adapter = new PrismaBetterSqlite3({ url: "./prisma/test.db" });
const prisma = new PrismaClient({ adapter });

// Demo events that mirror InMemoryEventRepository's DEMO_EVENTS
export const TEST_EVENTS = [
  {
    id: "event-draft-1",
    title: "Draft Planning Session",
    description: "Internal draft event for organizers.",
    location: "Room 201",
    category: "Planning",
    startDatetime: new Date("2026-05-01T18:00:00.000Z"),
    endDatetime: new Date("2026-05-01T19:00:00.000Z"),
    capacity: 25,
    organizerId: "user-staff",
    status: "draft",
    createdAt: new Date("2026-03-20T16:00:00.000Z"),
    updatedAt: new Date("2026-03-20T16:00:00.000Z"),
  },
  {
    id: "event-published-1",
    title: "Spring Showcase",
    description: "Open event for the whole community.",
    location: "Main Hall",
    category: "Showcase",
    startDatetime: new Date("2026-05-10T18:00:00.000Z"),
    endDatetime: new Date("2026-05-10T21:00:00.000Z"),
    capacity: 100,
    organizerId: "user-staff",
    status: "published",
    createdAt: new Date("2026-03-21T16:00:00.000Z"),
    updatedAt: new Date("2026-03-21T16:00:00.000Z"),
  },
  {
    id: "event-cancelled-1",
    title: "Cancelled Workshop",
    description: "Example cancelled event.",
    location: "Lab 3",
    category: "Workshop",
    startDatetime: new Date("2026-04-20T18:00:00.000Z"),
    endDatetime: new Date("2026-04-20T19:30:00.000Z"),
    organizerId: "user-admin",
    status: "cancelled",
    createdAt: new Date("2026-03-22T16:00:00.000Z"),
    updatedAt: new Date("2026-03-22T16:00:00.000Z"),
  },
] as const;

// Demo RSVPs that mirror InMemoryRsvpRepository's DEMO_RSVPS
export const TEST_RSVPS = [
  {
    id: "rsvp-1",
    eventId: "event-published-1",
    userId: "user-reader",
    status: "going",
    createdAt: new Date("2026-04-01T17:00:00.000Z"),
  },
  {
    id: "rsvp-2",
    eventId: "event-published-1",
    userId: "user-admin",
    status: "waitlisted",
    createdAt: new Date("2026-04-02T17:00:00.000Z"),
  },
  {
    id: "rsvp-3",
    eventId: "event-draft-1",
    userId: "user-reader",
    status: "cancelled",
    createdAt: new Date("2026-04-03T17:00:00.000Z"),
  },
] as const;

/**
 * Seed the test database with demo events and RSVPs.
 * Call this in beforeAll or beforeEach as needed.
 */
export async function seedTestData(): Promise<void> {
  await prisma.event.createMany({
    data: TEST_EVENTS,
  });

  await prisma.rsvp.createMany({
    data: TEST_RSVPS,
  });
}

/**
 * Clear all data from the test database.
 * Call this in beforeEach or afterAll to ensure test isolation.
 */
export async function cleanupTestData(): Promise<void> {
  await prisma.rsvp.deleteMany();
  await prisma.event.deleteMany();
  // Add SavedEvent cleanup once the model is added
}

/**
 * Disconnect Prisma client.
 * Call this in afterAll to avoid open handles.
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
