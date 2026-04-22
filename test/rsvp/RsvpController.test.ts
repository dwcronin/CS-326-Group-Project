import request from "supertest";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { createComposedApp } from "../../src/composition";
import * as EventRepo from "../../src/events/InMemoryEventRepository";
import * as RsvpRepo from "../../src/rsvp/InMemoryRsvpRepository";
import type { Event } from "../../src/events/Event";