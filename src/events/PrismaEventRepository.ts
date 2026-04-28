// src/events/PrismaEventRepository.ts

import { PrismaClient } from "@prisma/client";
import type { Event, EventUpdateFields } from "./Event.js";
import type { EventRepository } from "./EventRepository.js";

const prisma = new PrismaClient();

function toEvent(row: {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  status: string;
  capacity: number | null;
  startDatetime: Date;
  endDatetime: Date;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}): Event {
  return {
    id:            row.id,
    title:         row.title,
    description:   row.description,
    location:      row.location,
    category:      row.category,
    status:        row.status as Event["status"],
    capacity:      row.capacity ?? undefined,
    startDatetime: row.startDatetime,
    endDatetime:   row.endDatetime,
    organizerId:   row.organizerId,
    createdAt:     row.createdAt,
    updatedAt:     row.updatedAt,
  };
}

export async function findById(id: string): Promise<Event | null> {
  const row = await prisma.event.findUnique({ where: { id } });
  return row ? toEvent(row) : null;
}

export async function save(event: Event): Promise<Event> {
  const row = await prisma.event.upsert({
    where: { id: event.id },
    create: {
      id:            event.id,
      title:         event.title,
      description:   event.description,
      location:      event.location,
      category:      event.category,
      status:        event.status,
      capacity:      event.capacity ?? null,
      startDatetime: event.startDatetime,
      endDatetime:   event.endDatetime,
      organizerId:   event.organizerId,
    },
    update: {
      title:         event.title,
      description:   event.description,
      location:      event.location,
      category:      event.category,
      status:        event.status,
      capacity:      event.capacity ?? null,
      startDatetime: event.startDatetime,
      endDatetime:   event.endDatetime,
      organizerId:   event.organizerId,
    },
  });
  return toEvent(row);
}

export async function update(
  id: string,
  fields: EventUpdateFields,
): Promise<Event | null> {
  try {
    const row = await prisma.event.update({
      where: { id },
      data: {
        ...(fields.title         !== undefined && { title: fields.title }),
        ...(fields.description   !== undefined && { description: fields.description }),
        ...(fields.location      !== undefined && { location: fields.location }),
        ...(fields.category      !== undefined && { category: fields.category }),
        ...(fields.startDatetime !== undefined && { startDatetime: fields.startDatetime }),
        ...(fields.endDatetime   !== undefined && { endDatetime: fields.endDatetime }),
        // capacity: undefined means "no limit" — store as null in Prisma
        // capacity: a number means set it
        // if the key is absent from fields, don't touch it
        ...(Object.prototype.hasOwnProperty.call(fields, "capacity") && {
          capacity: fields.capacity ?? null,
        }),
      },
    });
    return toEvent(row);
  } catch {
    // Prisma throws if the record doesn't exist
    return null;
  }
}

export async function findAll(): Promise<Event[]> {
  const rows = await prisma.event.findMany({
    orderBy: { startDatetime: "asc" },
  });
  return rows.map(toEvent);
}