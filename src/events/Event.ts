// src/events/Event.ts

export type EventStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "past";

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  startDatetime: Date;
  endDatetime: Date;
  capacity?: number;
  organizerId: string;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;
  startDatetime: Date;
  endDatetime: Date;
  capacity?: number;
}

export interface EventUpdateFields {
  title?: string;
  description?: string;
  location?: string;
  category?: string;
  startDatetime?: Date;
  endDatetime?: Date;
  capacity?: number;
}

export type EventCreateError =
  | { name: "InvalidTitleError"; message: string }
  | { name: "InvalidDescriptionError"; message: string }
  | { name: "InvalidDateError"; message: string }
  | { name: "InvalidCapacityError"; message: string }
  | { name: "NotAuthorisedError"; message: string };

export type EventEditError =
  | { name: "EventNotFoundError"; message: string }
  | { name: "NotAuthorisedError"; message: string }
  | { name: "EventNotEditableError"; message: string }
  | { name: "InvalidTitleError"; message: string }
  | { name: "InvalidDescriptionError"; message: string }
  | { name: "InvalidDateError"; message: string }
  | { name: "InvalidCapacityError"; message: string };

export interface EventAttendeeSummary {
  userId: string;
  email: string;
  displayName: string;
  rsvpId: string;
  rsvpStatus: "going" | "waitlisted";
  rsvpCreatedAt: Date;
}

export type EventStatusChangeError =
  | { name: "EventNotFoundError"; message: string }
  | { name: "NotAuthorisedError"; message: string }
  | { name: "InvalidEventStatusError"; message: string };

export type EventAttendeeListError =
  | { name: "EventNotFoundError"; message: string }
  | { name: "NotAuthorisedError"; message: string };

export type EventDetailError =
  | { name: "EventNotFoundError"; message: string };