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
    }
}