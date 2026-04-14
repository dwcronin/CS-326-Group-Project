// src/events/InMemoryEventRepository.ts

import { Event, EventUpdateFields } from "./Event";

const store = new Map<string, Event>();

export function findById(id: string): Promise<Event | null> {
  return Promise.resolve(store.get(id) ?? null);
}

export function save(event: Event): Promise<Event> {
  store.set(event.id, event);
  return Promise.resolve(event);
}

export function update(id: string, fields: EventUpdateFields): Promise<Event | null> {
  const existing = store.get(id);
  if (!existing) return Promise.resolve(null);
  const updated: Event = { ...existing, ...fields, updatedAt: new Date() };
  store.set(id, updated);
  return Promise.resolve(updated);
}

export function findAll(): Promise<Event[]> {
  return Promise.resolve(Array.from(store.values()));
}

export function _clearForTesting(): void {
  store.clear();
}