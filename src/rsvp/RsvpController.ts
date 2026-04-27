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
    isHtmx: boolean,
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
    isHtmx: boolean,
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
      res.status(this.mapErrorStatus(result.value)).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    // Success — redirect back to the event detail page.
    if (isHtmx) {
      // Derive the new button state from the action.
      // A cancelled action means no active RSVP — show the plain RSVP button.
      const newStatus =
        result.value.rsvp.status === "cancelled"
          ? null
          : result.value.rsvp.status;

      res.render("rsvp/button", {
        eventId,
        rsvpStatus: newStatus,
        layout: false,
      });
    } else {
      res.redirect(`/events/${eventId}`);
    }
  }
}

export function CreateRsvpController(service: RsvpService): IRsvpController {
  return new RsvpController(service);
}
