import { Router, type IRouter } from "express";
import { db, sessions, registrations, users, attendance } from "@workspace/db";
import { eq, sql, inArray, asc } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionBody,
  ListSessionsQueryParams,
} from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { getUser } from "../lib/auth";

const router: IRouter = Router();

router.use(requireAuth);

async function decorateSessions(rows: (typeof sessions.$inferSelect)[], userId: string) {
  if (rows.length === 0) return [];
  const ids: string[] = rows.map((r) => r.id);
  const counts = await db
    .select({
      sessionId: registrations.sessionId,
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(registrations)
    .where(inArray(registrations.sessionId, ids))
    .groupBy(registrations.sessionId);
  const myRegs = await db
    .select({ sessionId: registrations.sessionId })
    .from(registrations)
    .where(eq(registrations.userId, userId));

  const countMap = new Map(counts.map((c) => [c.sessionId, c.count]));
  const myReg = new Set(myRegs.map((r) => r.sessionId));

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    location: s.location,
    room: s.room,
    track: s.track,
    mandatory: s.mandatory,
    capacity: s.capacity,
    registeredCount: countMap.get(s.id) ?? 0,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    organizers: s.organizers ?? [],
    speakers: s.speakers ?? [],
    tags: s.tags ?? [],
    isRegistered: myReg.has(s.id),
  }));
}

router.get("/sessions", async (req, res) => {
  const { track } = ListSessionsQueryParams.parse(req.query);
  const where = track && track !== "all" ? eq(sessions.track, track) : undefined;
  const rows = where
    ? await db.select().from(sessions).where(where).orderBy(asc(sessions.startsAt))
    : await db.select().from(sessions).orderBy(asc(sessions.startsAt));
  const out = await decorateSessions(rows, getUser(req).userId);
  res.json(out);
});

router.post(
  "/sessions",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
    const body = CreateSessionBody.parse(req.body);
    const [row] = await db
      .insert(sessions)
      .values({
        title: body.title,
        description: body.description,
        location: body.location,
        room: body.room,
        track: body.track ?? "all",
        mandatory: body.mandatory ?? false,
        capacity: body.capacity,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        organizers: body.organizers ?? [],
        speakers: body.speakers ?? [],
        tags: body.tags ?? [],
        createdBy: getUser(req).userId,
      })
      .returning();
    const [decorated] = await decorateSessions([row], getUser(req).userId);
    res.status(201).json(decorated);
  },
);

router.get("/sessions/:id", async (req, res) => {
  const id = String(req.params.id);
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const [decorated] = await decorateSessions([row], getUser(req).userId);
  const regs = await db
    .select()
    .from(registrations)
    .where(eq(registrations.sessionId, id));
  const userIds = regs.map((r) => r.userId);
  const attendees = userIds.length
    ? await db.select().from(users).where(inArray(users.id, userIds))
    : [];
  res.json({
    ...decorated,
    attendees: attendees.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
});

router.patch(
  "/sessions/:id",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
    const id = String(req.params.id);
    const body = UpdateSessionBody.parse(req.body);
    const update: Partial<typeof sessions.$inferInsert> = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.description !== undefined) update.description = body.description;
    if (body.location !== undefined) update.location = body.location;
    if (body.room !== undefined) update.room = body.room;
    if (body.track !== undefined) update.track = body.track;
    if (body.mandatory !== undefined) update.mandatory = body.mandatory;
    if (body.capacity !== undefined) update.capacity = body.capacity;
    if (body.startsAt !== undefined) update.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) update.endsAt = new Date(body.endsAt);
    if (body.organizers !== undefined) update.organizers = body.organizers;
    if (body.speakers !== undefined) update.speakers = body.speakers;
    if (body.tags !== undefined) update.tags = body.tags;
    const [row] = await db
      .update(sessions)
      .set(update)
      .where(eq(sessions.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const [decorated] = await decorateSessions([row], getUser(req).userId);
    res.json(decorated);
  },
);

router.delete(
  "/sessions/:id",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
    await db.delete(sessions).where(eq(sessions.id, String(req.params.id)));
    res.status(204).end();
  },
);

router.post("/sessions/:id/register", async (req, res) => {
  const userId = getUser(req).userId;
  const sid = String(req.params.id);
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sid));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registrations)
    .where(eq(registrations.sessionId, sid));
  if (count >= session.capacity) {
    res.status(409).json({ error: "Session is full" }); return;
  }

  try {
    const [row] = await db
      .insert(registrations)
      .values({ sessionId: sid, userId })
      .returning();
    res.json({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId,
      createdAt: row.createdAt.toISOString(),
    });
  } catch {
    const [existing] = await db
      .select()
      .from(registrations)
      .where(
        sql`${registrations.sessionId} = ${sid} AND ${registrations.userId} = ${userId}`,
      );
    if (!existing)
      res.status(500).json({ error: "Could not register" }); return;
    res.json({
      id: existing.id,
      sessionId: existing.sessionId,
      userId: existing.userId,
      createdAt: existing.createdAt.toISOString(),
    });
  }
});

router.delete("/sessions/:id/register", async (req, res) => {
  const userId = getUser(req).userId;
  await db
    .delete(registrations)
    .where(
      sql`${registrations.sessionId} = ${String(req.params.id)} AND ${registrations.userId} = ${userId}`,
    );
  res.status(204).end();
});

router.post("/sessions/:id/checkin", async (req, res) => {
  const userId = getUser(req).userId;
  const sid = String(req.params.id);
  const method = req.body?.method === "room" ? "room" : "qr";
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sid));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  try {
    const [row] = await db
      .insert(attendance)
      .values({ sessionId: sid, userId, method })
      .returning();
    res.json({
      id: row.id,
      sessionId: row.sessionId,
      userId: row.userId,
      method: row.method,
      checkedInAt: row.checkedInAt.toISOString(),
    });
  } catch {
    const [existing] = await db
      .select()
      .from(attendance)
      .where(
        sql`${attendance.sessionId} = ${sid} AND ${attendance.userId} = ${userId}`,
      );
    if (!existing)
      res.status(500).json({ error: "Could not check in" }); return;
    res.json({
      id: existing.id,
      sessionId: existing.sessionId,
      userId: existing.userId,
      method: existing.method,
      checkedInAt: existing.checkedInAt.toISOString(),
    });
  }
});

router.get("/sessions/:id/attendance", async (req, res) => {
  const sid = String(req.params.id);
  const rows = await db
    .select({
      id: attendance.id,
      sessionId: attendance.sessionId,
      userId: attendance.userId,
      method: attendance.method,
      checkedInAt: attendance.checkedInAt,
      user: users,
    })
    .from(attendance)
    .leftJoin(users, eq(attendance.userId, users.id))
    .where(eq(attendance.sessionId, sid));

  res.json(
    rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      userId: r.userId,
      method: r.method,
      checkedInAt: r.checkedInAt.toISOString(),
      user: r.user
        ? { ...r.user, createdAt: r.user.createdAt.toISOString() }
        : null,
    })),
  );
});

router.get("/me/registrations", async (req, res) => {
  const userId = getUser(req).userId;
  const myRegs = await db
    .select({ sessionId: registrations.sessionId })
    .from(registrations)
    .where(eq(registrations.userId, userId));
  const ids = myRegs.map((r) => r.sessionId);
  const rows = ids.length
    ? await db
        .select()
        .from(sessions)
        .where(inArray(sessions.id, ids))
        .orderBy(asc(sessions.startsAt))
    : [];
  const out = await decorateSessions(rows, userId);
  res.json(out);
});

export default router;
