// src/events/PrismaEventRepository.ts

import { PrismaClient } from "@prisma/client";
import type { Event, EventUpdateFields } from "./Event.js";
import type { EventRepository } from "./EventRepository.js";

const prisma = new PrismaClient();