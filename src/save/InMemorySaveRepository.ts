// src/save/InMemorySaveRepository.ts

import type { SavedEvent } from "./Save.js";

// Module-level store — nothing outside this file touches this directly
const store = new Map<string, SavedEvent>();

export function findByEventAndUser(
  eventId: string,
  userId: string,
): Promise<SavedEvent | null> {
  for (const record of store.values()) {
    if (record.eventId === eventId && record.userId === userId) {
      return Promise.resolve(record);
    }
  }
  return Promise.resolve(null);
}

export function findAllByUser(userId: string): Promise<SavedEvent[]> {
  const results = Array.from(store.values()).filter(
    (record) => record.userId === userId,
  );
  return Promise.resolve(results);
}

export function save(record: SavedEvent): Promise<SavedEvent> {
  store.set(record.id, record);
  return Promise.resolve(record);
}

export function deleteById(id: string): Promise<boolean> {
  const existed = store.has(id);
  store.delete(id);
  return Promise.resolve(existed);
}

// Only used in tests — lets each test start with a clean slate
export function _clearForTesting(): void {
  store.clear();
}
