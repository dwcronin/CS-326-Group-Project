// src/seed.ts
// Populates in-memory stores with sample data for local development.
// Called from composition.ts when NODE_ENV !== "test".

import { randomUUID } from "node:crypto";
import * as EventRepo from "./events/InMemoryEventRepository.js";

export function seed(): void {
  const now = new Date();

  const inOneDay  = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const yesterday  = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Published upcoming events — visible in the list, saveable
  void EventRepo.save({
    id: randomUUID(),
    title: "Jazz Night at the Rooftop",
    description: "An evening of smooth jazz with local musicians under the stars. Food and drinks available.",
    location: "The Rooftop Lounge, 45 Main St",
    category: "Music",
    startDatetime: inOneDay,
    endDatetime: new Date(inOneDay.getTime() + 3 * 60 * 60 * 1000),
    capacity: 60,
    organizerId: "seed-organizer-1",
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  void EventRepo.save({
    id: randomUUID(),
    title: "Community 5K Fun Run",
    description: "Join your neighbors for a casual 5K through the park. All fitness levels welcome.",
    location: "Riverside Park, Start Line near Pavilion",
    category: "Sports",
    startDatetime: inTwoDays,
    endDatetime: new Date(inTwoDays.getTime() + 2 * 60 * 60 * 1000),
    organizerId: "seed-organizer-1",
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  void EventRepo.save({
    id: randomUUID(),
    title: "Intro to Sourdough Baking",
    description: "Learn the basics of sourdough baking from scratch. Starter provided. Take home your own loaf.",
    location: "Community Kitchen, 12 Elm Ave",
    category: "Food & Drink",
    startDatetime: inOneWeek,
    endDatetime: new Date(inOneWeek.getTime() + 4 * 60 * 60 * 1000),
    capacity: 12,
    organizerId: "seed-organizer-2",
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  void EventRepo.save({
    id: randomUUID(),
    title: "Local History Walking Tour",
    description: "A guided walking tour of the historic district. Rain or shine.",
    location: "Town Hall Steps",
    category: "Education",
    startDatetime: inTwoWeeks,
    endDatetime: new Date(inTwoWeeks.getTime() + 2 * 60 * 60 * 1000),
    capacity: 25,
    organizerId: "seed-organizer-2",
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  // Draft event — not visible in list, not saveable
  void EventRepo.save({
    id: randomUUID(),
    title: "Summer Block Party (Draft)",
    description: "Annual block party — details TBD.",
    location: "Oak Street",
    category: "Community",
    startDatetime: inTwoWeeks,
    endDatetime: new Date(inTwoWeeks.getTime() + 5 * 60 * 60 * 1000),
    organizerId: "seed-organizer-1",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  });

  // Cancelled event — exists but not saveable (tests EventNotSavableError)
  void EventRepo.save({
    id: randomUUID(),
    title: "Cancelled: Outdoor Cinema",
    description: "Unfortunately this screening has been cancelled due to venue issues.",
    location: "Central Park Amphitheater",
    category: "Film",
    startDatetime: inOneWeek,
    endDatetime: new Date(inOneWeek.getTime() + 3 * 60 * 60 * 1000),
    organizerId: "seed-organizer-2",
    status: "cancelled",
    createdAt: twoDaysAgo,
    updatedAt: yesterday,
  });
}
