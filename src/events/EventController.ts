// src/events/EventController.ts

import { Router, Request, Response } from "express";
import { asyncHandler } from "express-async-handler"; // already in the starter
import { EventService } from "./EventService";
import { AppSessionStore, getAuthenticatedUser } from "../session/AppSession"; //is this right?
import { EventUpdateFields } from "./Event";

export class EventController {
  readonly router: Router;

  constructor(private readonly service: EventService) {
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {

    // GET /events/:id/edit — show the pre-populated edit form
    this.router.get(
      "/:id/edit",
      asyncHandler(async (req: Request, res: Response) => {
        const user = getAuthenticatedUser(req.session as AppSessionStore);

        if (!user) {
          res.redirect("/login");
          return;
        }

        // Members (role "user") are not allowed to see the edit form at all.
        if (user.role === "user") {
          res.status(403).render("error", {
            message: "You do not have permission to edit events.",
          });
          return;
        }

        const result = await this.service.getEventForEdit(
          user.userId,
          user.role,
          req.params.id
        );

        if (!result.ok) {
          const status =
            result.error.name === "EventNotFoundError" ? 404 :
            result.error.name === "NotAuthorisedError" ? 403 : 422;
          res.status(status).render("error", { message: result.error.message });
          return;
        }

        res.render("events/edit", {
          event:  result.value,
          errors: [],
          fields: {},
        });
      })
    );

    // POST /events/:id/edit — process the submitted form
    this.router.post(
      "/:id/edit",
      asyncHandler(async (req: Request, res: Response) => {
        const user = getAuthenticatedUser(req.session as AppSessionStore);

        if (!user) {
          res.redirect("/login");
          return;
        }

        if (user.role === "user") {
          res.status(403).render("error", {
            message: "You do not have permission to edit events.",
          });
          return;
        }

        const body = req.body as Record<string, string>;
        const fields: EventUpdateFields = {};

        if (body.title         !== undefined) fields.title         = body.title;
        if (body.description   !== undefined) fields.description   = body.description;
        if (body.location      !== undefined) fields.location      = body.location;
        if (body.category      !== undefined) fields.category      = body.category;
        if (body.startDatetime !== undefined) fields.startDatetime = new Date(body.startDatetime);
        if (body.endDatetime   !== undefined) fields.endDatetime   = new Date(body.endDatetime);

        // Empty string means the user cleared the field — treat as "no limit" (undefined)
        if (body.capacity !== undefined && body.capacity.trim() !== "") {
          fields.capacity = parseInt(body.capacity, 10);
        }

        const result = await this.service.updateEvent(
          user.userId,
          user.role,
          req.params.id,
          fields
        );

        if (!result.ok) {
          const isValidationError =
            result.error.name === "InvalidTitleError"       ||
            result.error.name === "InvalidDescriptionError" ||
            result.error.name === "InvalidDateError"        ||
            result.error.name === "InvalidCapacityError";

          if (isValidationError) {
            // Re-fetch the event to populate the form base, then re-render
            // with errors and the values the user typed so they aren't lost.
            const eventResult = await this.service.getEventForEdit(
              user.userId, user.role, req.params.id
            );
            if (!eventResult.ok) {
              res.status(404).render("error", { message: eventResult.error.message });
              return;
            }
            res.status(422).render("events/edit", {
              event:  eventResult.value,
              errors: [result.error.message],
              fields: body,
            });
            return;
          }

          // Permission or state errors go to a plain error page
          const status =
            result.error.name === "EventNotFoundError" ? 404 :
            result.error.name === "NotAuthorisedError" ? 403 : 422;
          res.status(status).render("error", { message: result.error.message });
          return;
        }

        // Success — redirect to the event detail page
        res.redirect(`/events/${result.value.id}`);
      })
    );
    
    }
}