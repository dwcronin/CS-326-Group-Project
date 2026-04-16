// src/save/SaveRepository.ts

import type { SavedEvent } from "./Save.js";

/**
 * Storage interface for saved events.
 * Sprint 1 uses InMemorySaveRepository.
 * Sprint 3 swaps in a Prisma-backed implementation without changing anything above this layer.
 */
export interface SaveRepository {
  findByEventAndUser(eventId: string, userId: string): Promise<SavedEvent | null>;
  findAllByUser(userId: string): Promise<SavedEvent[]>;
  save(record: SavedEvent): Promise<SavedEvent>;
  deleteById(id: string): Promise<boolean>;  // returns true if the record existed and was deleted
}
