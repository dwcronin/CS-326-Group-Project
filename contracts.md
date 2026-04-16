Before any feature code is written, your team must agree on the interface contracts for every service method that two or more features share or depend on.

Document these in a CONTRACTS.md file at the root of your repository. Each contract should specify:

* The method signature (name, parameters, return type)  
* What a successful result looks like  
* What named errors it can return

**Why this matters:** If you change a service method's return shape after a teammate has already built against it, that is an Integration Compromise — a **−10 point penalty** on your individual sprint score. CONTRACTS.md is your protection. See [grading](https://umamherst.instructure.com/courses/33786/pages/5-project-grading-local-event-board) for details.

## Feature 1 — Event Creation

Method Signature: async createEvent(organizerId, eventData)  
What a successful result looks like: Returns an event object with a generated ID, title, and other necessary fields.   
What named errors it can return: UnauthorizedEventCreationError(), InvalidEventTitleError(), InvalidEventDescriptionError(). 

Integration Compromise: 

## Feature 2 — Event Detail Page

Method Signature: async getEventDetails(eventID, viewer)  
What a successful result looks like: This async method returns an event object for the authorised viewer to see event-specific information.   
What named errors it can return: EventNotFoundError()

Integration Compromise: 

## Feature 3 — Event Editing

Method Signature: updateEvent(userID, EventID, fields to change) \-\> updated event object  
What a successful result looks like: Should return the updated event object with the correct changes to the fields specified  
What named errors it can return: EventNotFoundError (it doesn’t exist), NotAuthorisedError (user isn’t allowed to), EventNotEditableError (event is canceled or past), 

Integration Compromise: 

## Feature 4 — RSVP Toggle

Method Signature: toggleRSVP(userID, eventID) \-\> RsvpToggleResult promise  
What a successful result looks like: promise\<RsvpToggleResult\>  
What named errors it can return: EventNotFoundError (it doesn’t exist), NotAuthorisedError (user isn’t allowed to), EventNotRsvpableError (event is canceled or past), 

Integration Compromise: 

#### Feature 5 — Event Publishing and Cancellation

Method: async updateEventStatus(userID, eventID, newStatus)

Success: Returns the updated Event object { id, title, status: 'published' | 'cancelled', ... }

Named Errors: \* UnauthorizedError: User does not own the event.

InvalidStateTransitionError: Trying to publish a cancelled event or cancel a draft.

EventNotFoundError: The event ID doesn't exist

## Feature 10 — Event Search

Method Signature: EventSearch(query: string\[\], eventList: Event\[\]): Event  
What a successful result looks like: Return the Event object whose details (name, date, etc.) match the search query list. When a returned Event is selected, display the event details.  
What named errors it can return: We expect a list of Event objects to be returned, of some length greater than or equal to 0\. Possible errors:

- Invalid Date  
- Invalid Event Name  
- Invalid Event Guest Members  
- Invalid Event Object 

Note that the invalid date/name/guests errors will likely be impossible to produce in practice, given that we plan to use a dropdown menu with guardrails for query construction.

Integration Compromise: Assumes an Event object.

#### Feature 12 — Attendee List (Organizer)

Method: async getAttendeeList(userID, eventID)

Success: Returns an array of RSVP objects joined with user names, grouped by status (attending, waitlisted, cancelled).

Named Errors: \* UnauthorizedError: User is not the organizer or an admin.

EventNotFoundError: The event ID doesn't exist.

## Feature 14 — Save for Later

Method Signature: async toggleSaveEvent(userID, eventID) \-\> SaveToggleResult  
What a successful result looks like: Returns a SaveToggleResult object indicating the new saved state for the user and event.  
What named errors it can return:  
EventNotFoundError — The event does not exist UnauthorizedError — User is not a member (organizers/admins cannot save events) EventNotSavableError — Event is cancelled or otherwise invalid to save

Integration Compromise: Assumes an Event object.

