// src/rsvp/RsvpController.ts

import type { Response } from "express";
import type { IAppBrowserSession, AppSessionStore } from "../session/AppSession.js";
import type { RsvpService } from "./RsvpService.js";
import type { RsvpError } from "./Rsvp.js";

export interface IRsvpController {
  toggleRsvp(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(private readonly service: RsvpService) {}
  }
