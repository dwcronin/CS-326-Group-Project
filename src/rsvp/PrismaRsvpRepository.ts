// src/rsvp/PrismaRsvpRepository.ts

import { PrismaClient } from "@prisma/client";
import type { Rsvp, RsvpStatus } from "./Rsvp.js";
import type { RsvpRepository } from "./RsvpRepository.js";

const prisma = new PrismaClient();

function toRsvp(row: {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: Date;
}): Rsvp {
  return {
    id:        row.id,
    eventId:   row.eventId,
    userId:    row.userId,
    status:    row.status as RsvpStatus,
    createdAt: row.createdAt,
  };
}

export async function findByEventAndUser(
  eventId: string,
  userId: string,
): Promise<Rsvp | null> {
  const row = await prisma.rsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  return row ? toRsvp(row) : null;
}

export async function findActiveByEvent(eventId: string): Promise<Rsvp[]> {
  const rows = await prisma.rsvp.findMany({
    where: {
      eventId,
      status: { not: "cancelled" },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRsvp);
}

export async function save(rsvp: Rsvp): Promise<Rsvp> {
  const row = await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId: rsvp.eventId, userId: rsvp.userId } },
    create: {
      id:        rsvp.id,
      eventId:   rsvp.eventId,
      userId:    rsvp.userId,
      status:    rsvp.status,
      createdAt: rsvp.createdAt,
    },
    update: {
      status: rsvp.status,
    },
  });
  return toRsvp(row);
}