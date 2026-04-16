import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import type { Event } from "./events/Event";
import { CreateEventController } from "./events/EventController.js";
import { CreateInMemoryEventRepository } from "./events/InMemoryEventRepository.js";
import { EventService } from "./events/EventService.js";
import * as RsvpRepo from "./rsvp/InMemoryRsvpRepository.js";
import { RsvpService } from "./rsvp/RsvpService.js";
import { CreateRsvpController } from "./rsvp/RsvpController.js";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(
    authUsers,
    passwordHasher,
  );
  const authController = CreateAuthController(
    authService,
    adminUserService,
    resolvedLogger,
  );

  // Event feature wiring
  const seedEvents: Event[] = [
    {
      id: "event-published-1",
      title: "Community Cleanup Day",
      description:
        "Join neighbors for a local cleanup event at the community park.",
      location: "Amherst Community Park",
      category: "volunteer",
      startsAt: new Date("2026-04-20T10:00:00"),
      endsAt: new Date("2026-04-20T12:00:00"),
      capacity: 40,
      attendeeCount: 12,
      status: "published",
      organizerId: "staff-1",
      organizerName: "Staff User",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "event-draft-1",
      title: "Draft Planning Meetup",
      description:
        "This is a draft event that should only be visible to its organizer or an admin.",
      location: "Student Union Room 204",
      category: "social",
      startsAt: new Date("2026-04-25T18:00:00"),
      endsAt: new Date("2026-04-25T19:30:00"),
      capacity: 20,
      attendeeCount: 0,
      status: "draft",
      organizerId: "staff-1",
      organizerName: "Staff User",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const eventRepository = CreateInMemoryEventRepository(seedEvents);
  const eventService = new EventService(eventRepository);
  const eventController = CreateEventController(eventService);

  // RSVP feature wiring
  const rsvpService = new RsvpService(RsvpRepo, eventRepository);
  const rsvpController = CreateRsvpController(rsvpService);

  return CreateApp(
    authController,
    resolvedLogger,
    eventController,
    rsvpController,
  );
}