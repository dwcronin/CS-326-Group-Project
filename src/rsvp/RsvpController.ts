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

  private mapErrorStatus(error: RsvpError): number {
    if (error.name === "EventNotFoundError")    return 404;
    if (error.name === "NotAuthorisedError")    return 403;
    if (error.name === "EventNotRsvpableError") return 422;
    return 500;
  }

  async toggleRsvp(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void> {
    const user = session.authenticatedUser;

    if (!user) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.toggleRsvp(
      user.userId,
      user.role,
      eventId,
    );

    if (result.ok === false) {
      res.status(this.mapErrorStatus(result.value)).render("error", {
        message: result.value.message,
        session,
      });
      return;
    }

    // Success — redirect back to the event detail page.
    // Sprint 2 will replace this redirect with an HTMX inline response.
    res.redirect(`/events/${eventId}`);
  }
}

export function CreateRsvpController(service: RsvpService): IRsvpController {
  return new RsvpController(service);
}
