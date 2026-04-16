import { Ok, Err, type Result } from "../lib/result.js";
import {
  Event,
  EventUpdateFields,
  EventEditError,
  EventStatus,
  EventStatusChangeError,
  EventAttendeeSummary,
  EventAttendeeListError,
} from "./Event";
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
      return Err({ name: "EventNotFoundError", message: "Event not found." });
    }

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({ name: "NotAuthorisedError", message: "You do not have permission to edit this event." });
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({ name: "EventNotEditableError", message: "This event has been cancelled or has already concluded and cannot be edited." });
    }

    const validationError = this.validateFields(fields);
    if (validationError) return Err(validationError);

    const updated = await this.repo.update(eventId, fields);
    if (!updated) {
      return Err({ name: "EventNotFoundError", message: "Event could not be updated." });
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
      return Err({ name: "EventNotFoundError", message: "Event not found." });
    }

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({ name: "NotAuthorisedError", message: "You do not have permission to edit this event." });
    }

    if (event.status === "cancelled" || event.status === "past") {
      return Err({ name: "EventNotEditableError", message: "This event cannot be edited." });
    }

    return Ok(event);
  }


  private validateFields(fields: EventUpdateFields): EventEditError | null {
    if (fields.title !== undefined) {
      const t = fields.title.trim();
      if (t.length === 0) return { name: "InvalidTitleError", message: "Title cannot be empty." };
      if (t.length > 100) return { name: "InvalidTitleError", message: "Title must be 100 characters or fewer." };
    }

    if (fields.description !== undefined) {
      const d = fields.description.trim();
      if (d.length === 0)  return { name: "InvalidDescriptionError", message: "Description cannot be empty." };
      if (d.length > 2000) return { name: "InvalidDescriptionError", message: "Description must be 2000 characters or fewer." };
    }

    if (fields.startDatetime !== undefined && fields.endDatetime !== undefined) {
      if (fields.endDatetime <= fields.startDatetime) {
        return { name: "InvalidDateError", message: "End date must be after start date." };
      }
    }

    if (fields.capacity !== undefined) {
      if (!Number.isInteger(fields.capacity) || fields.capacity < 1) {
        return { name: "InvalidCapacityError", message: "Capacity must be a positive whole number, or leave blank for no limit." };
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
    if (!event) return Err({ name: "EventNotFoundError", message: "Event not found." });

    const isAdmin = actingUserRole === "admin";
    const isOrganizer = event.organizerId === actingUserId;
    if (!isAdmin && !isOrganizer) {
      return Err({ name: "NotAuthorisedError", message: "Not authorized to change status." });
    }

    const validTransition =
      (event.status === "draft" && nextStatus === "published") ||
      (event.status === "published" && nextStatus === "cancelled");

    if (!validTransition) {
      return Err({ name: "InvalidEventStatusError", message: "Invalid status transition." });
    }

    const updated = await this.repo.updateStatus(eventId, nextStatus);
    if (!updated) return Err({ name: "EventNotFoundError", message: "Update failed." });

    return Ok(updated);
  }

  async listEventAttendees(
    actingUserId: string,
    actingUserRole: "admin" | "staff" | "user",
    eventId: string
  ): Promise<Result<EventAttendeeSummary[], EventAttendeeListError>> {
    const event = await this.repo.findById(eventId);
    if (!event) return Err({ name: "EventNotFoundError", message: "Event not found." });

    if (actingUserRole !== "admin" && event.organizerId !== actingUserId) {
      return Err({ name: "NotAuthorisedError", message: "Access denied." });
    }

    const attendees = await this.repo.listAttendees(eventId);

    // Show "going" attendees first, then order each group by RSVP time.
    const sorted = [...attendees].sort((a, b) => {
      if (a.rsvpStatus !== b.rsvpStatus) {
        return a.rsvpStatus === "going" ? -1 : 1;
      }
      return a.rsvpCreatedAt.getTime() - b.rsvpCreatedAt.getTime();
    });

    return Ok(sorted);
  }
}