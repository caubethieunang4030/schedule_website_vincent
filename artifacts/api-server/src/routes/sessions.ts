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

async function getDecoratedSessions(userId: string, track?: string) {
  const where = track && track !== "all" ? eq(sessions.track, track) : undefined;
  
  const query = db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      location: sessions.location,
      room: sessions.room,
      track: sessions.track,
      mandatory: sessions.mandatory,
      capacity: sessions.capacity,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      organizers: sessions.organizers,
      speakers: sessions.speakers,
      tags: sessions.tags,
      registeredCount: sql<number>`(SELECT COALESCE(COUNT(*), 0)::int FROM ${registrations} WHERE ${registrations.sessionId} = ${sessions.id})`.as("registered_count"),
      isRegistered: sql<boolean>`EXISTS(SELECT 1 FROM ${registrations} WHERE ${registrations.sessionId} = ${sessions.id} AND ${registrations.userId} = ${userId})`.as("is_registered"),
    })
    .from(sessions);

  const rows = where 
    ? await query.where(where).orderBy(asc(sessions.startsAt))
    : await query.orderBy(asc(sessions.startsAt));

  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    location: s.location,
    room: s.room,
    track: s.track,
    mandatory: s.mandatory,
    capacity: s.capacity,
    registeredCount: s.registeredCount,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    organizers: s.organizers ?? [],
    speakers: s.speakers ?? [],
    tags: s.tags ?? [],
    isRegistered: !!s.isRegistered,
  }));
}

async function getDecoratedSessionById(sessionId: string, userId: string) {
  const [row] = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      location: sessions.location,
      room: sessions.room,
      track: sessions.track,
      mandatory: sessions.mandatory,
      capacity: sessions.capacity,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      organizers: sessions.organizers,
      speakers: sessions.speakers,
      tags: sessions.tags,
      registeredCount: sql<number>`(SELECT COALESCE(COUNT(*), 0)::int FROM ${registrations} WHERE ${registrations.sessionId} = ${sessions.id})`.as("registered_count"),
      isRegistered: sql<boolean>`EXISTS(SELECT 1 FROM ${registrations} WHERE ${registrations.sessionId} = ${sessions.id} AND ${registrations.userId} = ${userId})`.as("is_registered"),
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId));

  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    room: row.room,
    track: row.track,
    mandatory: row.mandatory,
    capacity: row.capacity,
    registeredCount: row.registeredCount,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    organizers: row.organizers ?? [],
    speakers: row.speakers ?? [],
    tags: row.tags ?? [],
    isRegistered: !!row.isRegistered,
  };
}

router.get("/sessions", async (req, res) => {
  const { track } = ListSessionsQueryParams.parse(req.query);
  const out = await getDecoratedSessions(getUser(req).userId, track);
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
    const decorated = await getDecoratedSessionById(row.id, getUser(req).userId);
    res.status(201).json(decorated);
  },
);

router.get("/sessions/:id", async (req, res) => {
  const id = String(req.params.id);
  const decorated = await getDecoratedSessionById(id, getUser(req).userId);
  if (!decorated) { res.status(404).json({ error: "Not found" }); return; }
  const attendeesRows = await db
    .select({ user: users })
    .from(registrations)
    .innerJoin(users, eq(registrations.userId, users.id))
    .where(eq(registrations.sessionId, id));
  res.json({
    ...decorated,
    attendees: attendeesRows.map((r) => ({
      ...r.user,
      createdAt: r.user.createdAt.toISOString(),
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
    const decorated = await getDecoratedSessionById(row.id, getUser(req).userId);
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

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Lock the session row to prevent race conditions during registration
      const [session] = await tx
        .select({ capacity: sessions.capacity })
        .from(sessions)
        .where(eq(sessions.id, sid))
        .for("update");

      if (!session) {
        return { status: 404, error: "Session not found" };
      }

      // 2. Fetch current registrations under lock
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(registrations)
        .where(eq(registrations.sessionId, sid));

      if (count >= session.capacity) {
        return { status: 409, error: "Session is full" };
      }

      // 3. Insert registration record
      const [row] = await tx
        .insert(registrations)
        .values({ sessionId: sid, userId })
        .returning();

      return { status: 200, data: row };
    });

    if (result.error || !result.data) {
      res.status(result.status).json({ error: result.error || "Could not register" });
      return;
    }

    res.json({
      id: result.data.id,
      sessionId: result.data.sessionId,
      userId: result.data.userId,
      createdAt: result.data.createdAt.toISOString(),
    });
  } catch (err) {
    // If insertion failed, check if they are already registered
    const [existing] = await db
      .select()
      .from(registrations)
      .where(
        sql`${registrations.sessionId} = ${sid} AND ${registrations.userId} = ${userId}`,
      );
    if (!existing) {
      res.status(500).json({ error: "Could not register" });
      return;
    }
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
  const rows = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      location: sessions.location,
      room: sessions.room,
      track: sessions.track,
      mandatory: sessions.mandatory,
      capacity: sessions.capacity,
      startsAt: sessions.startsAt,
      endsAt: sessions.endsAt,
      organizers: sessions.organizers,
      speakers: sessions.speakers,
      tags: sessions.tags,
      registeredCount: sql<number>`(SELECT COALESCE(COUNT(*), 0)::int FROM ${registrations} WHERE ${registrations.sessionId} = ${sessions.id})`.as("registered_count"),
      isRegistered: sql<boolean>`true`.as("is_registered"),
    })
    .from(sessions)
    .innerJoin(registrations, eq(sessions.id, registrations.sessionId))
    .where(eq(registrations.userId, userId))
    .orderBy(asc(sessions.startsAt));

  const out = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    location: s.location,
    room: s.room,
    track: s.track,
    mandatory: s.mandatory,
    capacity: s.capacity,
    registeredCount: s.registeredCount,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    organizers: s.organizers ?? [],
    speakers: s.speakers ?? [],
    tags: s.tags ?? [],
    isRegistered: true,
  }));
  res.json(out);
});

export default router;
