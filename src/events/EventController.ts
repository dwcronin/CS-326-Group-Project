// src/events/EventController.ts

import { Router, Request, Response } from "express";
import { asyncHandler } from "express-async-handler"; // already in the starter
import { EventService } from "./EventService";
import { AppSessionStore } from "../session/AppSession"; //is this right?
import { EventUpdateFields } from "./Event";

export class EventController {
  readonly router: Router;

  constructor(private readonly service: EventService) {
    this.router = Router();
    //this.registerRoutes();
  }
}