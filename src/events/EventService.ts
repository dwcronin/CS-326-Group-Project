import crypto from "node:crypto";

import { Ok, Err, type Result } from "../lib/result.js";
import {
  Event,
  CreateEventInput,
  EventCreateError,
  EventUpdateFields,
  EventEditError,
  EventStatus,
  EventStatusChangeError,
  EventAttendeeSummary,
  EventAttendeeListError,
  EventDetailError,
} from "./Event";
import { EventRepository } from "./EventRepository";

export class EventService {
  constructor(private readonly repo: EventRepository) {}

  async createEvent(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    input: CreateEventInput
  ): Promise<Result<Event, EventCreateError>> {
    if (actingUserRole === "user") {
      return Err({
        name: "NotAuthorisedError",
        message: "Only organizers can create events.",
      } as const);
    }

    const title = input.title.trim();
    if (title.length === 0) {
      return Err({
        name: "InvalidTitleError",
        message: "Title cannot be empty.",
      } as const);
    }
    if (title.length > 100) {
      return Err({
        name: "InvalidTitleError",
        message: "Title must be 100 characters or fewer.",
      } as const);
    }

    const description = input.description.trim();
    if (description.length === 0) {
      return Err({
        name: "InvalidDescriptionError",
        message: "Description cannot be empty.",
      } as const);
    }
    if (description.length > 2000) {
      return Err({
        name: "InvalidDescriptionError",
        message: "Description must be 2000 characters or fewer.",
      } as const);
    }

    if (input.endDatetime <= input.startDatetime) {
      return Err({
        name: "InvalidDateError",
        message: "End date must be after start date.",
      } as const);
    }

    if (input.capacity !== undefined) {
      if (!Number.isInteger(input.capacity) || input.capacity < 1) {
        return Err({
          name: "InvalidCapacityError",
          message: "Capacity must be a positive whole number, or leave blank for no limit.",
        } as const);
      }
    }

    const now = new Date();

    const event: Event = {
      id: crypto.randomUUID(),
      title,
      description,
      location: input.location.trim(),
      category: input.category.trim(),
      startDatetime: input.startDatetime,
      endDatetime: input.endDatetime,
      capacity: input.capacity,
      organizerId: actingUserId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.repo.save(event);
    return Ok(saved);
  }

  async getEventForView(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string
  ): Promise<Result<Event, EventDetailError>> {
    const event = await this.repo.findById(eventId);

    if (!event) {
      return Err({
        name: "EventNotFoundError",
        message: "Event not found.",
      } as const);
    }

    if (event.status === "draft") {
      const isAdmin = actingUserRole === "admin";
      const isOrganizer = event.organizerId === actingUserId;

      if (!isAdmin && !isOrganizer) {
        return Err({
          name: "EventNotFoundError",
          message: "Event not found.",
        } as const);
      }
    }

    return Ok(event);
  }

  async updateEvent(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string,
    fields: EventUpdateFields
  ): Promise<Result<Event, EventEditError>> {
    const event = await this.repo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({
        name: "NotAuthorisedError",
        message: "You do not have permission to edit this event.",
      } as const);
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({
        name: "EventNotEditableError",
        message: "This event has been cancelled or has already concluded and cannot be edited.",
      } as const);
    }

    const validationError = this.validateFields(fields);
    if (validationError) return Err(validationError);

    const updated = await this.repo.update(eventId, fields);
    if (!updated) {
      return Err({
        name: "EventNotFoundError",
        message: "Event could not be updated.",
      } as const);
    }

    return Ok(updated);
  }

  async getEventForEdit(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string
  ): Promise<Result<Event, EventEditError>> {
    const event = await this.repo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({
        name: "NotAuthorisedError",
        message: "You do not have permission to edit this event.",
      } as const);
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({
        name: "EventNotEditableError",
        message: "This event cannot be edited.",
      } as const);
    }

    return Ok(event);
  }

  private validateFields(fields: EventUpdateFields): EventEditError | null {
    if (fields.title !== undefined) {
      const t = fields.title.trim();
      if (t.length === 0) {
        return { name: "InvalidTitleError", message: "Title cannot be empty." };
      }
      if (t.length > 100) {
        return { name: "InvalidTitleError", message: "Title must be 100 characters or fewer." };
      }
    }

    if (fields.description !== undefined) {
      const d = fields.description.trim();
      if (d.length === 0) {
        return { name: "InvalidDescriptionError", message: "Description cannot be empty." };
      }
      if (d.length > 2000) {
        return { name: "InvalidDescriptionError", message: "Description must be 2000 characters or fewer." };
      }
    }

    if (fields.startDatetime !== undefined && fields.endDatetime !== undefined) {
      if (fields.endDatetime <= fields.startDatetime) {
        return { name: "InvalidDateError", message: "End date must be after start date." };
      }
    }

    if (fields.capacity !== undefined) {
      if (!Number.isInteger(fields.capacity) || fields.capacity < 1) {
        return {
          name: "InvalidCapacityError",
          message: "Capacity must be a positive whole number, or leave blank for no limit.",
        };
      }
    }

    return null;
  }

  async changeEventStatus(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string,
    nextStatus: EventStatus
  ): Promise<Result<Event, EventStatusChangeError>> {
    const event = await this.repo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({
        name: "NotAuthorisedError",
        message: "Not authorized to change status.",
      } as const);
    }

    const validTransition =
      (event.status === "draft" && nextStatus === "published") ||
      (event.status === "published" && nextStatus === "cancelled");

    if (!validTransition) {
      return Err({
        name: "InvalidEventStatusError",
        message: "Invalid status transition.",
      } as const);
    }

    const updated = await this.repo.updateStatus(eventId, nextStatus);
    if (!updated) {
      return Err({ name: "EventNotFoundError", message: "Update failed." } as const);
    }

    return Ok(updated);
  }

  async listEventAttendees(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string
  ): Promise<Result<EventAttendeeSummary[], EventAttendeeListError>> {
    const event = await this.repo.findById(eventId);
    if (!event) {
      return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
    }

    if (actingUserRole !== "admin" && event.organizerId !== actingUserId) {
      return Err({ name: "NotAuthorisedError", message: "Access denied." } as const);
    }

    const attendees = await this.repo.listAttendees(eventId);

    const sorted = [...attendees].sort((a, b) => {
      if (a.rsvpStatus !== b.rsvpStatus) {
        return a.rsvpStatus === "going" ? -1 : 1;
      }
      return a.rsvpCreatedAt.getTime() - b.rsvpCreatedAt.getTime();
    });

    return Ok(sorted);
  }
}