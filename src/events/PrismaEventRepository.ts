// src/events/PrismaEventRepository.ts

import { prisma } from "../lib/prisma.js";
import type { Event, EventUpdateFields, EventStatus, EventAttendeeSummary } from "./Event.js";
import type { EventRepository } from "./EventRepository.js";

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

export async function updateStatus(
  id: string,
  status: EventStatus,
): Promise<Event | null> {
  try {
    const row = await prisma.event.update({
      where: { id },
      data: { status },
    });
    return toEvent(row);
  } catch {
    return null;
  }
}

export async function listAttendees(
  id: string,
): Promise<EventAttendeeSummary[]> {
  const rsvps = await prisma.rsvp.findMany({
    where: {
      eventId: id,
      status: { in: ["going", "waitlisted"] },
    },
    orderBy: { createdAt: "asc" },
  });

  return rsvps.map((rsvp) => ({
    userId: rsvp.userId,
    email: rsvp.userId, // Sprint 3: userId only — display name not available without user table
    displayName: rsvp.userId,
    rsvpId: rsvp.id,
    rsvpStatus: rsvp.status as "going" | "waitlisted",
    rsvpCreatedAt: rsvp.createdAt,
  }));
}