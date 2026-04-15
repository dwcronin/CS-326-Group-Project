// src/rsvp/Rsvp.ts

export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
}

/**
 * The result shape returned by a successful toggleRsvp call.
 * Tells the caller what action was taken and what the new RSVP looks like.
 */
export interface RsvpToggleResult {
  rsvp: Rsvp;
  action: "created-going" | "created-waitlisted" | "cancelled" | "reactivated-going" | "reactivated-waitlisted";
}

/**
 * Named errors for Feature 4, as agreed in CONTRACTS.md.
 */
export type RsvpError =
  | { name: "EventNotFoundError";     message: string }
  | { name: "NotAuthorisedError";     message: string }
  | { name: "EventNotRsvpableError";  message: string };