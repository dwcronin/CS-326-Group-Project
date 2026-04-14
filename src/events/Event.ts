// src/events/Event.ts

/**
 * The canonical Event object used across all features.
 * Features 1, 2, 3, 4, and 10 all depend on this shape.
 * Do not change field names without coordinating with teammates (see CONTRACTS.md).
 */

export type EventStatus =
  | "draft"       // created but not visible to members (Feature 1, 2)
  | "published"   // visible and active, can be RSVPed/saved (Features 2, 4, 10, 14)
  | "cancelled"   // soft-deleted, no edits/RSVPs allowed (Features 3, 4, 14)
  | "past";  // past event, no edits/RSVPs allowed (Feature 3)

export interface Event {
  id: string;                 // unique identifier, e.g. UUID
  title: string;
  description: string;
  location: string;
  category: string;           // Added this as Feature 2 displays it
  startDateTime: Date;            
  endDateTime: Date;
  capacity?: number;           // maximum attendees; no limit if absent
  organizerId: string;        // matches User.id from the auth module
  status: EventStatus;        // now "draft" | "published" | "cancelled" | "past"
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The fields an organizer is allowed to change when editing.
 * All fields are optional — only the ones provided will be updated.
 * id, organizerId, status, createdAt are NOT editable through this type.
 */
export interface EventUpdateFields {
  title?: string;
  description?: string;
  location?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  capacity?: number;
}

/**
 * The named errors for Feature 3, as agreed in CONTRACTS.md.
 */
export type EventEditError =
  | { name: "EventNotFoundError";    message: string }
  | { name: "NotAuthorisedError";    message: string }
  | { name: "EventNotEditableError"; message: string }
  | { name: "InvalidTitleError";     message: string }
  | { name: "InvalidDescriptionError"; message: string }
  | { name: "InvalidDateError";      message: string }
  | { name: "InvalidCapacityError";  message: string };