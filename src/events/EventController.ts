// src/events/EventController.ts

import type { Response } from "express";
import type {
  IAppBrowserSession,
  AppSessionStore,
} from "../session/AppSession.js";
import type { EventService } from "./EventService";
import type {
  Event,
  CreateEventInput,
  EventCreateError,
  EventUpdateFields,
  EventEditError,
  EventAttendeeListError,
  EventAttendeeSummary,
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

  updateEventFromForm(
    res: Response,
    eventId: string,
    body: Record<string, string>,
    session: IAppBrowserSession,
    store: AppSessionStore,
    isHtmx: boolean,
  ): Promise<void>;

  publishEventFromForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  changeStatusFromForm(
    res: Response,
    eventId: string,
    body: Record<string, string>,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  showAttendeeList(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}
 
  private isHtmxRequest(res: Response): boolean {
    return res.req.get("HX-Request") === "true";
  }

  private toCreateError(result: { value: unknown }): EventCreateError {
    return result.value as EventCreateError;
  }

  private toEditError(result: { value: unknown }): EventEditError {
    return result.value as EventEditError;
  }

  private toStatusError(result: { value: unknown }): EventStatusChangeError {
    return result.value as EventStatusChangeError;
  }

  private toAttendeeListError(result: { value: unknown }): EventAttendeeListError {
    return result.value as EventAttendeeListError;
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

  private isHtmxRequest(res: Response): boolean {
    return res.req.get("HX-Request") === "true";
  }
  private mapAttendeeListErrorStatus(error: EventAttendeeListError): number {
    if (error.name === "EventNotFoundError") return 404;
    if (error.name === "NotAuthorisedError") return 403;
    return 500;
  }
 /**
   * Renders the attendee list — returns a layout-less HTMX fragment
   * for inline requests, or the full attendees page for direct navigation.
   */
  private renderAttendeeList(
    res: Response,
    eventId: string,
    attendees: EventAttendeeSummary[],
    session: IAppBrowserSession,
  ): void {
    if (this.isHtmxRequest(res)) {
      res.render("events/partials/attendee-list", {
        attendees,
        eventId,
        session,
        layout: false,
      });
      return;
    }
    res.render("events/attendees", {
      attendees,
      eventId,
      session,
    });
  }
 
  private renderLifecyclePanel(
    res: Response,
    event: Event,
    session: IAppBrowserSession,
    errorMessage?: string,
  ): void {
    res.render("events/partials/lifecycle-panel", {
      event,
      errorMessage: errorMessage ?? null,
      session,
      layout: false,
    });
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
    const isHtmx = this.isHtmxRequest(res);

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

      if (isHtmx) {
        res.status(this.mapCreateErrorStatus(error)).render(
          "events/partials/create-form",
          {
            errors: [error.message],
            fields: body,
            layout: false,
          },
        );
        return;
      }

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

      if (isHtmx) {
        res.render("events/partials/create-success", {
          event: { ...createdEvent, status: "published" },
          mode: "published",
          message: "Event created and published successfully.",
          layout: false,
        });
        return;
      }

      res.redirect(`/events/${createdEvent.id}`);
      return;
    }

    if (isHtmx) {
      res.render("events/partials/create-success", {
        event: createdEvent,
        mode: "draft",
        message: "Event saved as draft successfully.",
        layout: false,
      });
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

    if (result.ok === false) {
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
      lifecycleError: null,
      session,
    });
  }


  async updateEventFromForm(
  res: Response,
  eventId: string,
  body: Record<string, string>,
  session: IAppBrowserSession,
  _store: AppSessionStore,
  isHtmx: boolean = false,
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

  if (result.ok === false) {
    const error = this.toEditError(result);

    const isValidationError =
      error.name === "InvalidTitleError"       ||
      error.name === "InvalidDescriptionError" ||
      error.name === "InvalidDateError"        ||
      error.name === "InvalidCapacityError";

<<<<<<< HEAD
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
          const eventError = this.toEditError(eventResult);
          res.status(this.mapEditErrorStatus(eventError)).render("partials/error", {
            message: eventError.message,
            layout: false,
          });
          return;
        }
 
        res.status(422).render("events/edit", {
          event: eventResult.value,
          errors: [error.message],
          fields: body,
          lifecycleError: null,
          session,
        });
        return;
      }
 
      res.status(this.mapEditErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }
 
    res.redirect(`/events/${result.value.id}/edit`);
=======
    if (isValidationError) {
      const eventResult = await this.service.getEventForEdit(
        user.userId,
        user.role,
        eventId,
      );

      if (eventResult.ok === false) {
        const fetchError = this.toEditError(eventResult);
        res.status(this.mapEditErrorStatus(fetchError)).render("partials/error", {
          message: fetchError.message,
          layout: false,
        });
        return;
      }

      res.status(422).render("events/edit", {
        event:  eventResult.value,
        errors: [error.message],
        fields: body,
        session,
        layout: isHtmx ? false : undefined,
      });
      return;
    }

    // Non-validation errors go to the error partial
    res.status(this.mapEditErrorStatus(error)).render("partials/error", {
      message: error.message,
      layout: false,
    });
    return;
>>>>>>> origin/dev
  }

  // Success
  if (isHtmx) {
    res.set("HX-Redirect", `/events/${result.value.id}`);
    res.status(200).end();
  } else {
    res.redirect(`/events/${result.value.id}`);
  }
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

    if (result.ok === false) {
      const error = this.toStatusError(result);

      res.status(this.mapStatusErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    res.redirect("/events");
  }

  async changeStatusFromForm(
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
        message: "You do not have permission to change event status.",
        layout: false,
      });
      return;
    }

    const nextStatus = body.status;
    if (nextStatus !== "published" && nextStatus !== "cancelled") {
      if (this.isHtmxRequest(res)) {
        const currentEventResult = await this.service.getEventForEdit(
          user.userId,
          user.role,
          eventId,
        );
 
        if (!currentEventResult.ok) {
          const error = this.toEditError(currentEventResult);
          res.status(this.mapEditErrorStatus(error)).render("partials/error", {
            message: error.message,
            layout: false,
          });
          return;
        }
 
        res.status(422);
        this.renderLifecyclePanel(
          res,
          currentEventResult.value,
          session,
          "Invalid status transition.",
        );
        return;
      }
 
      res.status(422).render("partials/error", {
        message: "Invalid status transition.",
        layout: false,
      });
      return;
    }

    const result = await this.service.changeEventStatus(
      user.userId,
      user.role,
      eventId,
      nextStatus,
    );

    if (!result.ok) {
      const error = this.toStatusError(result);
 
      if (this.isHtmxRequest(res) && error.name !== "EventNotFoundError") {
        const currentEventResult = await this.service.getEventForEdit(
          user.userId,
          user.role,
          eventId,
        );
 
        if (currentEventResult.ok) {
          res.status(this.mapStatusErrorStatus(error));
          this.renderLifecyclePanel(res, currentEventResult.value, session, error.message);
          return;
        }
      }
 
      res.status(this.mapStatusErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }
 
    if (this.isHtmxRequest(res)) {
      this.renderLifecyclePanel(res, result.value, session);
      return;
    }
 
    res.redirect(`/events/${eventId}/edit`);
  }

  async showAttendeeList(
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
        message: "You do not have permission to view attendee lists.",
        layout: false,
      });
      return;
    }

    const result = await this.service.listEventAttendees(
      user.userId,
      user.role,
      eventId,
    );

    if (!result.ok) {
      const error = this.toAttendeeListError(result);

      res.status(this.mapAttendeeListErrorStatus(error)).render("partials/error", {
        message: error.message,
        layout: false,
      });
      return;
    }

    this.renderAttendeeList(res, eventId, result.value, session);
  }
}

export function CreateEventController(service: EventService): IEventController {
  return new EventController(service);
}
 
