import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SESSIONS,
  handleSessionsFallback,
} from "./static-host-sessions.ts";
import { DEFAULT_TASKS, handleTasksFallback } from "./static-host-tasks.ts";

test("creating a task stores checklist items on that task", () => {
  const created = handleTasksFallback(
    "/api/tasks",
    "POST",
    {
      title: "Bring extra HDMI cables",
      assigneeId: "user_admin_01",
      status: "todo",
      initialChecklist: ["Pack bag", "Check adapters"],
    },
    DEFAULT_TASKS,
  );

  assert.equal(created.matched, true);
  assert.equal(created.tasks[0].title, "Bring extra HDMI cables");
  assert.equal(created.tasks[0].checklists.length, 2);
  assert.equal(created.tasks[0].checklists[0].taskId, created.tasks[0].id);
  assert.ok(created.tasks[0].createdAt);
});

test("POST /api/tasks/:id/checklists does not create a new task", () => {
  const started = handleTasksFallback(
    "/api/tasks",
    "POST",
    { title: "Stage mics", assigneeId: "user_admin_01" },
    DEFAULT_TASKS,
  );
  const beforeCount = started.tasks.length;
  const checklist = handleTasksFallback(
    `/api/tasks/${started.tasks[0].id}/checklists`,
    "POST",
    { title: "Label the crate" },
    started.tasks,
  );

  assert.equal(checklist.matched, true);
  assert.equal(checklist.response.title, "Label the crate");
  assert.equal(checklist.tasks.length, beforeCount);
  assert.equal(
    checklist.tasks.find((t) => t.id === started.tasks[0].id).checklists.length,
    1,
  );
});

test("PATCH updates status and GET recovers from corrupted storage", () => {
  const created = handleTasksFallback(
    "/api/tasks",
    "POST",
    { title: "Lock auditorium", assigneeId: "user_admin_01" },
    DEFAULT_TASKS,
  );
  const patched = handleTasksFallback(
    `/api/tasks/${created.tasks[0].id}`,
    "PATCH",
    { status: "done" },
    created.tasks,
  );
  assert.equal(patched.tasks[0].status, "done");

  const recovered = handleTasksFallback("/api/tasks", "GET", null, { not: "an-array" });
  assert.equal(recovered.matched, true);
  assert.equal(Array.isArray(recovered.response), true);
});

test("registering a session shows up in My Schedule payload", () => {
  const registered = handleSessionsFallback(
    "/api/sessions/session_ai_middle_01/register",
    "POST",
    null,
    DEFAULT_SESSIONS,
    ["session_keynote_01"],
  );
  assert.equal(registered.matched, true);
  assert.ok(registered.regs.includes("session_ai_middle_01"));

  const mine = handleSessionsFallback(
    "/api/me/registrations",
    "GET",
    null,
    registered.sessions,
    registered.regs,
  );
  assert.equal(mine.matched, true);
  assert.ok(mine.response.some((s) => s.id === "session_ai_middle_01"));
  assert.ok(mine.response.every((s) => s.startsAt));
});

test("GET /api/me/registrations is not treated as POST /register", () => {
  const listed = handleSessionsFallback(
    "/api/me/registrations",
    "GET",
    null,
    DEFAULT_SESSIONS,
    ["session_web_upper_01"],
  );
  assert.equal(listed.matched, true);
  assert.equal(listed.response.length, 1);
  assert.equal(listed.response[0].id, "session_web_upper_01");
});

test("POST /api/sessions creates a session instead of returning the list", () => {
  const created = handleSessionsFallback(
    "/api/sessions",
    "POST",
    { title: "Evening rehearsal", capacity: "12" },
    DEFAULT_SESSIONS,
    [],
  );
  assert.equal(created.matched, true);
  assert.equal(created.response.title, "Evening rehearsal");
  assert.equal(created.response.capacity, 12);
  assert.equal(created.sessions.length, DEFAULT_SESSIONS.length + 1);
});
