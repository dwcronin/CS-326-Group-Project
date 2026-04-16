import type { Event } from "./Event";

export interface IEventRepository {
  create(event: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  listAll(): Promise<Event[]>;
}