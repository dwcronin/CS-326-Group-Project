import request from "supertest";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
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