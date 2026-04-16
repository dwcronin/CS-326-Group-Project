// src/save/Save.ts

/**
 * The canonical SavedEvent object for Feature 14 (Save for Later).
 * Records are created on save and deleted on unsave — no status field needed.
 * See CONTRACTS.md for the agreed interface.
 */
export interface SavedEvent {
  id: string;        // UUID
  eventId: string;   // references Event.id
  userId: string;    // references User.id from the auth module
  createdAt: Date;
}

/**
 * The result shape returned by a successful toggleSaveEvent call.
 * Tells the caller what action was taken and what the new save record looks like.
 * savedEvent is null when the action is "unsaved" (the record was deleted).
 */
export interface SaveToggleResult {
  savedEvent: SavedEvent | null;
  action: "saved" | "unsaved";
}

/**
 * Named errors for Feature 14, as agreed in CONTRACTS.md.
 * Note: UnauthorizedError uses American spelling to match the contract.
 */
export type SaveError =
  | { name: "EventNotFoundError";   message: string }
  | { name: "UnauthorizedError";    message: string }   // only members ("user" role) may save
  | { name: "EventNotSavableError"; message: string };  // event is not published
