// src/rsvp/Rsvp.ts

export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  createdAt: Date;
}