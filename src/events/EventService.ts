import { Ok, Err, type Result } from "../lib/result.js";
import { Event, EventUpdateFields, EventEditError } from "./Event";
import { EventRepository } from "./EventRepository";

export class EventService {
  constructor(private readonly repo: EventRepository) {}


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
      return Err({ name: "NotAuthorisedError", message: "You do not have permission to edit this event." } as const);
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({ name: "EventNotEditableError", message: "This event has been cancelled or has already concluded and cannot be edited." } as const);
    }

    const validationError = this.validateFields(fields);
    if (validationError) return Err(validationError);

    const updated = await this.repo.update(eventId, fields);
    if (!updated) {
      return Err({ name: "EventNotFoundError", message: "Event could not be updated." } as const);
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
      return Err({ name: "NotAuthorisedError", message: "You do not have permission to edit this event." } as const);
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({ name: "EventNotEditableError", message: "This event cannot be edited." } as const);
    }

    return Ok(event);
  }


  private validateFields(fields: EventUpdateFields): EventEditError | null {
    if (fields.title !== undefined) {
      const t = fields.title.trim();
      if (t.length === 0) return { name: "InvalidTitleError", message: "Title cannot be empty." } as const;
      if (t.length > 100) return { name: "InvalidTitleError", message: "Title must be 100 characters or fewer." } as const;
    }

    if (fields.description !== undefined) {
      const d = fields.description.trim();
      if (d.length === 0)  return { name: "InvalidDescriptionError", message: "Description cannot be empty." } as const;
      if (d.length > 2000) return { name: "InvalidDescriptionError", message: "Description must be 2000 characters or fewer." } as const;
    }

    if (fields.startDatetime !== undefined && fields.endDatetime !== undefined) {
      if (fields.endDatetime <= fields.startDatetime) {
        return { name: "InvalidDateError", message: "End date must be after start date." } as const;
      }
    }

    if (fields.capacity !== undefined) {
      if (!Number.isInteger(fields.capacity) || fields.capacity < 1) {
        return { name: "InvalidCapacityError", message: "Capacity must be a positive whole number, or leave blank for no limit." } as const;
      }
    }

    return null;
  }
}

export interface EventService {
  changeEventStatus(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string,
    nextStatus: "draft" | "published" | "cancelled" | "past",
  ): Promise<Result<Event, import("./Event").EventStatusChangeError>>;
  listEventAttendees(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string,
  ): Promise<Result<import("./Event").EventAttendeeSummary[], import("./Event").EventAttendeeListError>>;
}

EventService.prototype.changeEventStatus = async function changeEventStatus(
  this: EventService,
  actingUserId: string,
  actingUserRole: "admin" | "staff" | "user",
  eventId: string,
  nextStatus: "draft" | "published" | "cancelled" | "past",
): Promise<Result<Event, import("./Event").EventStatusChangeError>> {
  const repo = (this as unknown as { repo: EventRepository }).repo;
  const event = await repo.findById(eventId);

  if (!event) {
    return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
  }

  const isAdmin = actingUserRole === "admin";
  const isOrganizer = event.organizerId === actingUserId;
  if (!isAdmin && !isOrganizer) {
    return Err({ name: "NotAuthorisedError", message: "You do not have permission to change this event's status." } as const);
  }

  const allowedTransitions: Record<string, string[]> = {
    draft: ["published"],
    published: ["cancelled"],
    cancelled: [],
    past: [],
  };

  if (!allowedTransitions[event.status]?.includes(nextStatus)) {
    return Err({
      name: "InvalidEventStatusError",
      message: `Cannot change event status from ${event.status} to ${nextStatus}.`,
    } as const);
  }

  const updated = await repo.updateStatus(eventId, nextStatus);
  if (!updated) {
    return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
  }

  return Ok(updated);
};

EventService.prototype.listEventAttendees = async function listEventAttendees(
  this: EventService,
  actingUserId: string,
  actingUserRole: "admin" | "staff" | "user",
  eventId: string,
): Promise<Result<import("./Event").EventAttendeeSummary[], import("./Event").EventAttendeeListError>> {
  const repo = (this as unknown as { repo: EventRepository }).repo;
  const event = await repo.findById(eventId);

  if (!event) {
    return Err({ name: "EventNotFoundError", message: "Event not found." } as const);
  }

  const isAdmin = actingUserRole === "admin";
  const isOrganizer = event.organizerId === actingUserId;
  if (!isAdmin && !isOrganizer) {
    return Err({ name: "NotAuthorisedError", message: "You do not have permission to view this attendee list." } as const);
  }

  const attendees = await repo.listAttendees(eventId);
  attendees.sort((left, right) => left.rsvpCreatedAt.getTime() - right.rsvpCreatedAt.getTime());

  return Ok(attendees);
};
