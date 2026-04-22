import request from "supertest";
import type { Express } from "express";
import { createComposedApp } from "../../src/composition";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import * as RsvpRepo from "../../src/rsvp/InMemoryRsvpRepository";
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

