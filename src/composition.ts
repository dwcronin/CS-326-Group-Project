import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { seed } from "./seed.js";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

import * as EventRepo from "./events/PrismaEventRepository.js";
import { EventService } from "./events/EventService.js";
import { CreateEventController } from "./events/EventController.js";

import * as RsvpRepo from "./rsvp/PrismaRsvpRepository.js";
import { RsvpService } from "./rsvp/RsvpService.js";
import { CreateRsvpController } from "./rsvp/RsvpController.js";

import * as SaveRepo from "./save/InMemorySaveRepository.js";
import { SaveService } from "./save/SaveService.js";
import { CreateSaveController } from "./save/SaveController.js";

import { SearchService } from "./search/SearchService.js";
import { CreateSearchController } from "./search/SearchController.js";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  if (process.env.NODE_ENV !== "test") seed();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Event feature wiring
  const eventService = new EventService(EventRepo);
  const eventController = CreateEventController(eventService);

  // RSVP feature wiring
  // RsvpService takes both repos — it needs EventRepo to check event status
  // and capacity, and RsvpRepo to read and write RSVPs.
  const rsvpService = new RsvpService(RsvpRepo, EventRepo);
  const rsvpController = CreateRsvpController(rsvpService);

  const saveService = new SaveService(SaveRepo, EventRepo);
  const saveController = CreateSaveController(saveService);

  // Search feature wiring
  const searchService = new SearchService(EventRepo);
  const searchController = CreateSearchController(searchService);

  return CreateApp(authController, resolvedLogger, eventController, rsvpController, saveController, searchController);
}
