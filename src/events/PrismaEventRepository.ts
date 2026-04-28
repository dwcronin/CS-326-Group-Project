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