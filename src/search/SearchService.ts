// src/search/SearchService.ts

import { Ok, Err, type Result } from "../lib/result.js";
import type { Event } from "../events/Event.js";
import type { EventRepository } from "../events/EventRepository.js";

export type SearchError = { name: "InvalidSearchQueryError"; message: string };

export interface SearchResult {
  events: Event[];
  query: string;
}

export class SearchService {
  constructor(private readonly eventRepo: EventRepository) {}

  /**
   * filterEvents — Feature 10 contract method.
   * Pure filter over a pre-fetched event list: no I/O, no Result wrapper.
   * Other features can call this directly with their own event list.
   *
   * Keeps only published events whose startDatetime is in the future,
   * then — if any query tokens are provided — keeps only events where
   * every token appears (case-insensitive) in title, description, or location.
   * Results are sorted by startDatetime ascending.
   *
   * @param query      Tokens to match against (empty array = return all upcoming)
   * @param eventList  Pre-fetched events to filter
   */
  filterEvents(query: string[], eventList: Event[]): Event[] {
    const now = new Date();

    const upcoming = eventList.filter(
      (e) => e.status === "published" && e.startDatetime >= now,
    );

    if (query.length === 0) {
      return upcoming.sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
    }

    const lowerTokens = query.map((t) => t.toLowerCase());

    const matched = upcoming.filter((e) => {
      const haystack = [e.title, e.description, e.location, e.category]
        .join(" ")
        .toLowerCase();
      return lowerTokens.every((token) => haystack.includes(token));
    });

    return matched.sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  /**
   * searchEvents — full service entry point used by SearchController.
   * Validates the raw query string, fetches all events from the repo,
   * then delegates filtering to filterEvents.
   *
   * @param rawQuery  The user-supplied search string (may be empty)
   */
  async searchEvents(rawQuery: string): Promise<Result<SearchResult, SearchError>> {
    const query = rawQuery.trim();

    if (query.length > 200) {
      return Err({
        name: "InvalidSearchQueryError",
        message: "Search query must be 200 characters or fewer.",
      } as const);
    }

    const allEvents = await this.eventRepo.findAll();
    const tokens = query.length > 0 ? query.split(/\s+/).filter(Boolean) : [];
    const events = this.filterEvents(tokens, allEvents);

    return Ok({ events, query });
  }
}
