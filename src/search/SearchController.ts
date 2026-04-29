// src/search/SearchController.ts

import type { Response } from "express";
import type { IAppBrowserSession } from "../session/AppSession.js";
import type { SearchService } from "./SearchService.js";

export interface ISearchController {
  showEventList(
    res: Response,
    rawQuery: string,
    session: IAppBrowserSession,
    savedEventIds: string[],
    isHtmx: boolean,
  ): Promise<void>;
}

class SearchController implements ISearchController {
  constructor(private readonly service: SearchService) {}

  async showEventList(
    res: Response,
    rawQuery: string,
    session: IAppBrowserSession,
    savedEventIds: string[],
    isHtmx: boolean,
  ): Promise<void> {
    const result = await this.service.searchEvents(rawQuery);

    if (result.ok === false) {
      res.status(422).render("partials/error", {
        message: result.value.message,
        layout: false,
      });
      return;
    }

    const { events, query } = result.value;

    if (isHtmx) {
      // Return only the results fragment — HTMX swaps it into #event-results
      res.render("events/_list-results", { events, query, savedEventIds, session, layout: false });
      return;
    }

    res.render("events/list", { events, query, savedEventIds, session });
  }
}

export function CreateSearchController(service: SearchService): ISearchController {
  return new SearchController(service);
}
