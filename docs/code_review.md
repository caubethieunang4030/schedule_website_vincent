# Code Review Report and Improvement Plan (Gap Summit)

This document summarizes the source-quality review of **schedule_website_vincent** and a checklist for fixing the issues that were found.

---

## 1. Current Code Quality

### Strengths
*   **Clear monorepo structure**: `pnpm` workspaces split the modules cleanly (`lib/db`, `lib/api-zod`, `artifacts/summit`, `artifacts/api-server`).
*   **Authentication and authorization**: Clerk is integrated tightly, together with a student-email check (`.edu`, `.org`).
*   **Strong validation**: API input is validated with a shared Zod schema from `@workspace/api-zod`.

### Weaknesses and risks
1.  **Database performance**: `decorateSessions` runs many separate queries instead of a SQL JOIN, which adds latency.
2.  **Race conditions**: Capacity is checked in application code, so concurrent requests can register past the limit.
3.  **Email-check logic gap**: Checking that an email `endsWith` `.org` or `.edu` can be fooled by a lookalike subdomain.

---

## 2. Fix Checklist

### Database and API backend (`artifacts/api-server`)

- [ ] **Optimize `decorateSessions`**
    *   [ ] Refactor the query in [sessions.ts](file:///Users/huynhduyanh/Git/schedule_website_vincent/artifacts/api-server/src/routes/sessions.ts) to use a SQL JOIN or subquery so `registeredCount` and the current user's `isRegistered` flag come back in one SQL statement.
    *   [ ] Measure response time before and after the change.

- [ ] **Close the registration race condition**
    *   [ ] Use a database transaction with a row lock (`FOR UPDATE`) when checking capacity.
    *   [ ] Or enforce the limit in the INSERT itself (a constraint or a condition) so a new row cannot be inserted once the limit is reached.

- [ ] **Make the email check exact**
    *   [ ] Update `isSchoolEmail` in [auth.ts](file:///Users/huynhduyanh/Git/schedule_website_vincent/artifacts/api-server/src/lib/auth.ts) so it takes the domain after `@` before checking the suffix.
    *   [ ] Add unit tests for valid and invalid emails (for example, `fake@edu.attacker.com` must be rejected).

- [ ] **Restructure the code**
    *   [ ] Use a controller pattern so business logic is not inside the route file.
    *   [ ] Add global error-handling middleware so error responses share one JSON shape.

### User interface (`artifacts/summit`)

- [ ] **Loading state and UI race conditions**
    *   [ ] Disable the register button as soon as it is clicked so duplicate requests cannot be sent.
    *   [ ] Show a skeleton loader while the registered-session list refreshes.

- [ ] **Tune the React Query cache**
    *   [ ] Set `staleTime` and `gcTime` so switching between Dashboard and Schedule tabs does not call the API on every visit.

---

## 3. Feature Roadmap

- [ ] **Smart attendance**
    *   [ ] Generate a short-lived QR code for faculty/admin that refreshes every 10 seconds.
    *   [ ] Let students scan that QR code with the phone camera inside the web app.
- [ ] **Export reports and data**
    *   [ ] Let admin/faculty export feedback and form responses to CSV/Excel.
- [ ] **Personal calendar sync**
    *   [ ] Export a student's schedule as an `.ics` (iCal) file for Apple Calendar or Google Calendar.
