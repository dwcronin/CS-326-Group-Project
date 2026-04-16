import type { Response } from "express";
import type {
  IAppBrowserSession,
  IAuthenticatedUserSession,
} from "../session/AppSession";
import type { IEventViewer } from "./Event";
import { EventService } from "./EventService";
import {
  EventAccessDeniedError,
  EventNotFoundError,
  EventValidationError,
} from "./errors";

export interface IEventController {
  showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    pageError?: string | null,
  ): Promise<void>;

  createFromForm(
    res: Response,
    input: {
      title: string;
      description: string;
      location: string;
      category: string;
      startsAt: string;
      endsAt: string;
      capacity: string;
    },
    currentUser: IAuthenticatedUserSession,
    session: IAppBrowserSession,
  ): Promise<void>;

  showEventDetail(
    res: Response,
    eventId: string,
    viewer: IEventViewer,
    session: IAppBrowserSession,
  ): Promise<void>;

  showEventsIndex(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void>;

  // teammate routes already expect these
  showEditForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    _store: unknown,
  ): Promise<void>;

  updateEventFromForm(
    res: Response,
    eventId: string,
    input: Record<string, string>,
    session: IAppBrowserSession,
    _store: unknown,
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: EventService) {}

  async showCreateForm(
    res: Response,
    session: IAppBrowserSession,
    pageError: string | null = null,
  ): Promise<void> {
    res.render("events/new", {
      pageError,
      session,
      formData: {
        title: "",
        description: "",
        location: "",
        category: "",
        startsAt: "",
        endsAt: "",
        capacity: "",
      },
    });
  }

  async createFromForm(
    res: Response,
    input: {
      title: string;
      description: string;
      location: string;
      category: string;
      startsAt: string;
      endsAt: string;
      capacity: string;
    },
    currentUser: IAuthenticatedUserSession,
    session: IAppBrowserSession,
  ): Promise<void> {
    try {
      const event = await this.service.createEvent(
        {
          title: input.title,
          description: input.description,
          location: input.location,
          category: input.category,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          capacity:
            input.capacity.trim() === ""
              ? null
              : Number.parseInt(input.capacity, 10),
        },
        {
          userId: currentUser.userId,
          name: currentUser.displayName,
          role: currentUser.role,
        },
      );

      res.redirect(`/events/${event.id}`);
    } catch (error) {
      if (
        error instanceof EventValidationError ||
        error instanceof EventAccessDeniedError
      ) {
        res.status(
          error instanceof EventAccessDeniedError ? 403 : 400,
        );

        res.render("events/new", {
          pageError: error.message,
          session,
          formData: input,
        });
        return;
      }

      throw error;
    }
  }

  async showEventDetail(
    res: Response,
    eventId: string,
    viewer: IEventViewer,
    session: IAppBrowserSession,
  ): Promise<void> {
    try {
      const event = await this.service.getEventById(eventId, viewer);

      res.render("events/show", {
        pageError: null,
        session,
        event,
      });
    } catch (error) {
      if (error instanceof EventNotFoundError) {
        res.status(404).render("partials/error", {
          message: "Event not found",
          layout: false,
        });
        return;
      }

      if (error instanceof EventAccessDeniedError) {
        res.status(403).render("partials/error", {
          message: "Access denied",
          layout: false,
        });
        return;
      }

      throw error;
    }
  }

  async showEventsIndex(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void> {
    const events = await this.service.listPublishedEvents();

    res.render("events/index", {
      pageError: null,
      session,
      events,
    });
  }

  // temporary placeholders so teammate routes keep compiling
  async showEditForm(
    res: Response,
    _eventId: string,
    session: IAppBrowserSession,
    _store: unknown,
  ): Promise<void> {
    res.status(501).render("partials/error", {
      message: "Event editing is not implemented yet.",
      layout: false,
      session,
    });
  }

  async updateEventFromForm(
    res: Response,
    _eventId: string,
    _input: Record<string, string>,
    session: IAppBrowserSession,
    _store: unknown,
  ): Promise<void> {
    res.status(501).render("partials/error", {
      message: "Event editing is not implemented yet.",
      layout: false,
      session,
    });
  }
}

export function CreateEventController(
  service: EventService,
): IEventController {
  return new EventController(service);
}