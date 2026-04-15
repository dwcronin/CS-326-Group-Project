// src/rsvp/RsvpService.ts

import { randomUUID } from "node:crypto";
import { Ok, Err, type Result } from "../lib/result.js";
import type { RsvpToggleResult, RsvpError } from "./Rsvp.js";
import type { RsvpRepository } from "./RsvpRepository.js";
import type { EventRepository } from "../events/EventRepository.js";