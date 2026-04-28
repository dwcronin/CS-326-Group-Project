// src/rsvp/PrismaRsvpRepository.ts

import { PrismaClient } from "@prisma/client";
import type { Rsvp, RsvpStatus } from "./Rsvp.js";
import type { RsvpRepository } from "./RsvpRepository.js";

const prisma = new PrismaClient();