import { Ok, Err, type Result } from "../lib/result.js";
import { Event, EventUpdateFields, EventEditError } from "./Event";
import { EventRepository } from "./EventRepository";

export class EventService {
  constructor(private readonly repo: EventRepository) {}

  
}