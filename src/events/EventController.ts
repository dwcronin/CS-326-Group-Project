// src/events/EventController.ts

import type { Response } from "express";
import type { IAppBrowserSession, AppSessionStore } from "../session/AppSession.js";
import type { EventService } from "./EventService";
import type { EventUpdateFields, EventEditError } from "./Event";

export interface IEventController {
  showEditForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;
  updateEventFromForm(
    res: Response,
    eventId: string,
    body: Record<string, string>,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}

  private mapErrorStatus(error: EventEditError): number {
    if (error.name === "EventNotFoundError")    return 404;
    if (error.name === "NotAuthorisedError")    return 403;
    if (error.name === "EventNotEditableError") return 422;
    if (error.name === "InvalidTitleError")     return 422;
    if (error.name === "InvalidDescriptionError") return 422;
    if (error.name === "InvalidDateError")      return 422;
    if (error.name === "InvalidCapacityError")  return 422;
    return 500;
  }

  async showEditForm(
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

    if (user.role === "user") {
      res.status(403).render("partials/error", {
        message: "You do not have permission to edit events.",
        layout: false,
      });
      return;
    }

    const result = await this.service.getEventForEdit(
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

    res.render("events/edit", {
      event:   result.value,
      errors:  [],
      fields:  {},
      session,
    });
  }

  async updateEventFromForm(
    res: Response,
    eventId: string,
    body: Record<string, string>,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void> {
    const user = session.authenticatedUser;

    if (!user) {
      res.redirect("/login");
      return;
    }

    if (user.role === "user") {
      res.status(403).render("partials/error", {
        message: "You do not have permission to edit events.",
        layout: false,
      });
      return;
    }

    const fields: EventUpdateFields = {};
    if (body.title         !== undefined) fields.title         = body.title;
    if (body.description   !== undefined) fields.description   = body.description;
    if (body.location      !== undefined) fields.location      = body.location;
    if (body.startDatetime !== undefined) fields.startDateTime = new Date(body.startDatetime);
    if (body.endDatetime   !== undefined) fields.endDateTime   = new Date(body.endDatetime);

    // Empty string means the user cleared the field — treat as "no limit" (undefined)
    if (body.capacity !== undefined && body.capacity.trim() !== "") {
      fields.capacity = parseInt(body.capacity, 10);
    }

    const result = await this.service.updateEvent(
      user.userId,
      user.role,
      eventId,
      fields,
    );

    if (result.ok === false) {
      const isValidationError =
        result.value.name === "InvalidTitleError"       ||
        result.value.name === "InvalidDescriptionError" ||
        result.value.name === "InvalidDateError"        ||
        result.value.name === "InvalidCapacityError";

      if (isValidationError) {
        // Re-fetch the event to populate the form base, then re-render
        // with the error message and the values the user typed.
        const eventResult = await this.service.getEventForEdit(
          user.userId, user.role, eventId,
        );
        if (eventResult.ok === false) {
          res.status(this.mapErrorStatus(eventResult.value)).render("partials/error", {
            message: eventResult.value.message,
            layout: false,
          });
          return;
        }
        res.status(422).render("events/edit", {
          event:   eventResult.value,
          errors:  [result.value.message],
          fields:  body,
          session,
        });
        return;
      }

      res.status(this.mapErrorStatus(result.value)).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    res.redirect(`/events/${result.value.id}`);
  }
}

export function CreateEventController(service: EventService): IEventController {
  return new EventController(service);
}