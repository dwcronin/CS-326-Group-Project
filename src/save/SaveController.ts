// src/save/SaveController.ts

import type { Response } from "express";
import type { IAppBrowserSession, AppSessionStore } from "../session/AppSession.js";
import type { SaveService } from "./SaveService.js";
import type { SaveError } from "./Save.js";

export interface ISaveController {
  toggleSaveEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    store: AppSessionStore,
  ): Promise<void>;

  showSavedList(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void>;

  getSavedEventIds(userId: string): Promise<string[]>;
}

class SaveController implements ISaveController {
  constructor(private readonly service: SaveService) {}

  private mapErrorStatus(error: SaveError): number {
    if (error.name === "EventNotFoundError")   return 404;
    if (error.name === "UnauthorizedError")    return 403;
    if (error.name === "EventNotSavableError") return 422;
    return 500;
  }

  async toggleSaveEvent(
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

    const result = await this.service.toggleSaveEvent(user.userId, user.role, eventId);

    if (result.ok === false) {
      res.status(this.mapErrorStatus(result.value)).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    res.redirect("/events");
  }

  async showSavedList(
    res: Response,
    session: IAppBrowserSession,
  ): Promise<void> {
    const user = session.authenticatedUser;
    if (!user) {
      res.redirect("/login");
      return;
    }

    const result = await this.service.getSavedEvents(user.userId, user.role);

    if (result.ok === false) {
      res.status(this.mapErrorStatus(result.value)).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    res.render("save/saved-list", { savedEvents: result.value, session });
  }

  async getSavedEventIds(userId: string): Promise<string[]> {
    return this.service.getSavedEventIds(userId);
  }
}

export function CreateSaveController(service: SaveService): ISaveController {
  return new SaveController(service);
}
