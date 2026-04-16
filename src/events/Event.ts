export type EventStatus = "draft" | "published";

export interface Event {
  id: string;

  title: string;
  description: string;
  location: string;
  category: string;

  startsAt: Date;
  endsAt: Date;

  capacity: number | null;
  attendeeCount: number;

  status: EventStatus;

  organizerId: string;
  organizerName: string;

  createdAt: Date;
  updatedAt: Date;
}

// Input used when creating a new event
export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  category: string;

  startsAt: Date;
  endsAt: Date;

  capacity: number | null;
}

// Represents the user trying to view or create events
export interface IEventViewer {
  userId: string;
  role: "admin" | "staff" | "user";
}