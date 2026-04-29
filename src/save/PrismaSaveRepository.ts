// src/save/PrismaSaveRepository.ts

import { prisma } from "../lib/prisma.js";
import type { SavedEvent } from "./Save.js";

function toSavedEvent(row: {
  id: string;
  eventId: string;
  userId: string;
  createdAt: Date;
}): SavedEvent {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    createdAt: row.createdAt,
  };
}

export async function findByEventAndUser(
  eventId: string,
  userId: string,
): Promise<SavedEvent | null> {
  const row = await prisma.savedEvent.findFirst({
    where: {
      eventId,
      userId,
    },
  });

  return row ? toSavedEvent(row) : null;
}

export async function findAllByUser(userId: string): Promise<SavedEvent[]> {
  const rows = await prisma.savedEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toSavedEvent);
}

export async function save(record: SavedEvent): Promise<SavedEvent> {
  const row = await prisma.savedEvent.create({
    data: {
      id: record.id,
      eventId: record.eventId,
      userId: record.userId,
      createdAt: record.createdAt,
    },
  });

  return toSavedEvent(row);
}

export async function deleteById(id: string): Promise<boolean> {
  try {
    await prisma.savedEvent.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    // If the record doesn't exist, Prisma throws an error
    return false;
  }
}
