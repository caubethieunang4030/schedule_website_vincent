# User Requirements
**Project:** Gap Learning Summit Schedule Website

---

## 1. User Stories

Below are 3 representative user stories for the 3 main groups of people who use the system:

**User Story 1: Student**
> "As a **student**, I want to **filter the event list by my school division** (Lower, Middle, Upper) so that I **can easily find and register for classes that match my age instead of browsing the entire crowded schedule**."

**User Story 2: Speaker / Faculty**
> "As a **speaker**, I want to **see the details of my assigned room** (room name, location, start time, and end time) on my personal screen so that I **can arrive at the right place and set up the projector and materials before the workshop starts**."

**User Story 3: Organizer / Admin**
> "As an **organizer**, I want to **edit an event's details** (such as the name, time, or room) directly in the admin interface (CMS) so that I **can update the schedule for every student immediately when something changes (for example, rain forces an outdoor class to move indoors)**."

---

## 2. Detailed Use Cases

These flows are taken from the user stories above. They describe how a person (actor) and the system interact.

### Use Case 1: Filter Sessions by Track
*(Mapped from User Story 1)*

- **Actor:** Student.
- **Pre-conditions:**
  - The student is signed in (through Clerk).
  - The student is on the schedule list screen ("Schedule").

- **Main flow:**
  1. The student opens the "Schedule" page in the web app.
  2. The system loads the data and shows every event for Learning Summit day.
  3. The student opens the dropdown to choose the "Track" filter.
  4. The student selects their division (for example, "Middle").
  5. The frontend notices the change and filters the event list (keeping only events tagged `track: "middle"` or `track: "all"`).
  6. The system refreshes immediately and shows the filtered events.

- **Alternative flows / errors:**
  - **5a. No matching events:**
    1. The filtered list is empty.
    2. The system shows an empty state: *"No events match the current filter. You have some free time!"*
  - **5b. Network loss while loading the API (if filtering happens on the server):**
    1. The system shows a red toast: *"Could not load the event list. Check your network connection."*
    2. The previous list stays on screen, with a "Retry" button.

---

### Use Case 2: Update Session Information
*(Mapped from User Story 3)*

- **Actor:** Organizer / Admin.
- **Pre-conditions:**
  - The user is signed in and has an admin role (`organizer` or `admin`).
  - The user is on the event management page (CMS / Admin Dashboard).

- **Main flow:**
  1. The organizer finds and opens the event they want to change (for example, the "Robotics Build Lab" workshop).
  2. They click "Edit Session".
  3. The system opens a popup form already filled with the event's current data (title, description, room, capacity, and so on).
  4. The organizer clears the old room name and enters a new one (for example, changing "M-110" to "M-115").
  5. The organizer clicks "Save" / "Update".
  6. The frontend sends `PUT /api/sessions/:id` with the new data to the backend.
  7. The backend API checks that the sender is an admin and runs an UPDATE against the Neon (PostgreSQL) database.
  8. The system returns success (200 OK). The frontend closes the form, shows a green toast *"Event updated"*, and reloads the new data.

- **Alternative flows / errors:**
  - **7a. Invalid input (validation error):**
    1. The organizer accidentally enters a negative capacity.
    2. Zod middleware on the backend (or the frontend) rejects the request.
    3. Nothing is saved. The frontend highlights that field with the warning *"Capacity must be a number greater than 0"*.
  - **7b. Session expired or insufficient permission:**
    1. The backend checks the token, finds that it has expired, and returns `401 Unauthorized`.
    2. The system cancels the save, shows an error, and asks the organizer to sign in again.
