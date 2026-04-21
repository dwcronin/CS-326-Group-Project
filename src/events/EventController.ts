// src/events/EventController.ts

import type { Response } from "express";
import type {
  IAppBrowserSession,
  AppSessionStore,
} from "../session/AppSession.js";
import type { EventService } from "./EventService";
import type {
  CreateEventInput,
  EventCreateError,
  EventUpdateFields,
  EventEditError,
  EventStatusChangeError,
} from "./Event";

export interface IEventController {
  showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  createEventFromForm(
    res: Response,
    body: Record<string, string>,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  showEditForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  showEditFormPartial(
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

  publishEventFromForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}

  private toCreateError(result: { value: unknown }): EventCreateError {
    return result.value as EventCreateError;
  }

  private toEditError(result: { value: unknown }): EventEditError {
    return result.value as EventEditError;
  }

  private toStatusError(result: { value: unknown }): EventStatusChangeError {
    return result.value as EventStatusChangeError;
  }

  private mapCreateErrorStatus(error: EventCreateError): number {
    if (error.name === "NotAuthorisedError") return 403;
    if (error.name === "InvalidTitleError") return 422;
    if (error.name === "InvalidDescriptionError") return 422;
    if (error.name === "InvalidDateError") return 422;
    if (error.name === "InvalidCapacityError") return 422;
    return 500;
  }

  private mapEditErrorStatus(error: EventEditError): number {
    if (error.name === "EventNotFoundError") return 404;
    if (error.name === "NotAuthorisedError") return 403;
    if (error.name === "EventNotEditableError") return 422;
    if (error.name === "InvalidTitleError") return 422;
    if (error.name === "InvalidDescriptionError") return 422;
    if (error.name === "InvalidDateError") return 422;
    if (error.name === "InvalidCapacityError") return 422;
    return 500;
  }

  private mapStatusErrorStatus(error: EventStatusChangeError): number {
    if (error.name === "EventNotFoundError") return 404;
    if (error.name === "NotAuthorisedError") return 403;
    if (error.name === "InvalidEventStatusError") return 422;
    return 500;
  }

  async showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    _store: AppSessionStore,
  ): Promise<void> {
    const user = session.authenticatedUser;

    if (!user) {
      res.redirect("/login");
      return;
    }

    if (user.role === "user") {
      res.status(403).render("partials/error", {
        message: "Only organizers can create events.",
        layout: false,
      });
      return;
    }

    res.render("events/new", {
      errors: [],
      fields: {},
      session,
    });
  }

  async createEventFromForm(
    res: Response,
    body: Record<string, string>,
    session: IAppBrowserSession,
    _store: AppSessionStore,
  ): Promise<void> {
    const user = session.authenticatedUser;

    if (!user) {
      res.redirect("/login");
      return;
    }

    if (user.role === "user") {
      res.status(403).render("partials/error", {
        message: "Only organizers can create events.",
        layout: false,
      });
      return;
    }

    const input: CreateEventInput = {
      title: body.title ?? "",
      description: body.description ?? "",
      location: body.location ?? "",
      category: body.category ?? "",
      startDatetime: new Date(body.startDatetime ?? ""),
      endDatetime: new Date(body.endDatetime ?? ""),
      capacity:
        body.capacity !== undefined && body.capacity.trim() !== ""
          ? parseInt(body.capacity, 10)
          : undefined,
    };

    const createResult = await this.service.createEvent(
      user.userId,
      user.role,
      input,
    );

    if (!createResult.ok) {
      const error = this.toCreateError(createResult);

      res.status(this.mapCreateErrorStatus(error)).render("events/new", {
        errors: [error.message],
        fields: body,
        session,
      });
      return;
    }

    const createdEvent = createResult.value;
    const intent = body.intent ?? "draft";

    if (intent === "publish") {
      const publishResult = await this.service.changeEventStatus(
        user.userId,
        user.role,
        createdEvent.id,
        "published",
      );

      if (!publishResult.ok) {
        const error = this.toStatusError(publishResult);

        res.status(this.mapStatusErrorStatus(error)).render("partials/error", {
          message: error.message,
          layout: false,
        });
        return;
      }

      res.redirect("/events");
      return;
    }

    res.redirect(`/events/${createdEvent.id}/edit`);
  }

  async showEditForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    _store: AppSessionStore,
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

    if (!result.ok) {
      const error = this.toEditError(result);

      res.status(this.mapEditErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      event: result.value,
      errors: [],
      fields: {},
      session,
    });
  }

  async showEditFormPartial(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    _store: AppSessionStore,
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

    if (!result.ok) {
      const error = this.toEditError(result);

      res.status(this.mapEditErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      event: result.value,
      errors: [],
      fields: {},
      session,
      layout: false,
    });
  }

  async updateEventFromForm(
    res: Response,
    eventId: string,
    body: Record<string, string>,
    session: IAppBrowserSession,
    _store: AppSessionStore,
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

    if (body.title !== undefined) fields.title = body.title;
    if (body.description !== undefined) fields.description = body.description;
    if (body.location !== undefined) fields.location = body.location;
    if (body.category !== undefined) fields.category = body.category;

    if (body.startDatetime !== undefined) {
      fields.startDatetime = new Date(body.startDatetime);
    }

    if (body.endDatetime !== undefined) {
      fields.endDatetime = new Date(body.endDatetime);
    }

    if (body.capacity !== undefined && body.capacity.trim() !== "") {
      fields.capacity = parseInt(body.capacity, 10);
    }

    const result = await this.service.updateEvent(
      user.userId,
      user.role,
      eventId,
      fields,
    );

    if (!result.ok) {
      const error = this.toEditError(result);

      const isValidationError =
        error.name === "InvalidTitleError" ||
        error.name === "InvalidDescriptionError" ||
        error.name === "InvalidDateError" ||
        error.name === "InvalidCapacityError";

      if (isValidationError) {
        const eventResult = await this.service.getEventForEdit(
          user.userId,
          user.role,
          eventId,
        );

        if (!eventResult.ok) {
          const fetchError = this.toEditError(eventResult);

          res.status(this.mapEditErrorStatus(fetchError)).render("partials/error", {
            message: fetchError.message,
            layout: false,
          });
          return;
        }

        res.status(422).render("events/edit", {
          event: eventResult.value,
          errors: [error.message],
          fields: body,
          session,
          layout: false,
        });
        return;
      }

      res.status(this.mapEditErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect(`/events/${eventId}/edit`);
  }

  async publishEventFromForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    _store: AppSessionStore,
  ): Promise<void> {
    const user = session.authenticatedUser;

    if (!user) {
      res.redirect("/login");
      return;
    }

    if (user.role === "user") {
      res.status(403).render("partials/error", {
        message: "You do not have permission to publish events.",
        layout: false,
      });
      return;
    }

    const result = await this.service.changeEventStatus(
      user.userId,
      user.role,
      eventId,
      "published",
    );

    if (!result.ok) {
      const error = this.toStatusError(result);

      res.status(this.mapStatusErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/events");
  }
}

export function CreateEventController(service: EventService): IEventController {
  return new EventController(service);
}