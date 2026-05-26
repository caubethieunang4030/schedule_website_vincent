import { Router, type IRouter } from "express";
import { db, tasks, users, sessions, registrations, attendance } from "@workspace/db";
import { eq, sql, inArray, desc, asc } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { getUser } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

function ser(
  t: typeof tasks.$inferSelect,
  u?: { firstName: string | null; lastName: string | null; email: string },
) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    assigneeId: t.assigneeId,
    assigneeName: u
      ? [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null
      : null,
    assigneeEmail: u?.email ?? null,
    status: t.status,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  };
}

router.get("/tasks", async (_req, res) => {
  const rows = await db
    .select({
      task: tasks,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .orderBy(desc(tasks.createdAt));
  res.json(
    rows.map((r) =>
      ser(
        r.task,
        r.email
          ? { firstName: r.firstName, lastName: r.lastName, email: r.email }
          : undefined,
      ),
    ),
  );
});

router.post(
  "/tasks",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
    const body = CreateTaskBody.parse(req.body);
    const [row] = await db
      .insert(tasks)
      .values({
        title: body.title,
        description: body.description ?? null,
        assigneeId: body.assigneeId,
        status: body.status ?? "todo",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        createdBy: getUser(req).userId,
      })
      .returning();
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.assigneeId));
    res.status(201).json(ser(row, u));
  },
);

router.patch("/tasks/:id", async (req, res) => {
  const id = String(req.params.id);
  const body = UpdateTaskBody.parse(req.body);
  const update: Partial<typeof tasks.$inferInsert> = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
  if (body.dueAt !== undefined)
    update.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if (body.status !== undefined) {
    update.status = body.status;
    update.completedAt = body.status === "done" ? new Date() : null;
  }
  const [row] = await db
    .update(tasks)
    .set(update)
    .where(eq(tasks.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [u] = await db.select().from(users).where(eq(users.id, row.assigneeId));
  res.json(ser(row, u));
});

router.delete(
  "/tasks/:id",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
    await db.delete(tasks).where(eq(tasks.id, String(req.params.id)));
    res.status(204).end();
  },
);

router.get("/tasks/export", async (_req, res) => {
  const rows = await db
    .select({
      task: tasks,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .orderBy(desc(tasks.createdAt));
  const taskRows = rows.map((r) => ({
    id: r.task.id,
    title: r.task.title,
    description: r.task.description ?? null,
    assigneeName:
      [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
    assigneeEmail: r.email ?? null,
    status: r.task.status,
    dueAt: r.task.dueAt ? r.task.dueAt.toISOString() : null,
    completedAt: r.task.completedAt ? r.task.completedAt.toISOString() : null,
    createdAt: r.task.createdAt.toISOString(),
  }));

  const allSessions = await db
    .select()
    .from(sessions)
    .orderBy(asc(sessions.startsAt));
  const ids: string[] = allSessions.map((s) => s.id);
  const regCounts = ids.length
    ? await db
        .select({
          sessionId: registrations.sessionId,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(registrations)
        .where(inArray(registrations.sessionId, ids))
        .groupBy(registrations.sessionId)
    : [];
  const attCounts = ids.length
    ? await db
        .select({
          sessionId: attendance.sessionId,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(attendance)
        .where(inArray(attendance.sessionId, ids))
        .groupBy(attendance.sessionId)
    : [];
  const regMap = new Map(regCounts.map((c) => [c.sessionId, c.count]));
  const attMap = new Map(attCounts.map((c) => [c.sessionId, c.count]));

  const sessionRows = allSessions.map((s) => ({
    id: s.id,
    title: s.title,
    track: s.track,
    room: s.room,
    capacity: s.capacity,
    registeredCount: regMap.get(s.id) ?? 0,
    attendedCount: attMap.get(s.id) ?? 0,
    startsAt: s.startsAt.toISOString(),
  }));

  res.json({ tasks: taskRows, sessions: sessionRows });
});

export default router;
