import { Router, type IRouter } from "express";
import {
  db,
  sessions,
  registrations,
  attendance,
  feedback,
  tasks,
  notifications,
  users,
} from "@workspace/db";
import { sql, gte, asc, desc, inArray, eq, ne } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getUser } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/dashboard/summary", async (req, res) => {
  const userId = getUser(req).userId;
  const now = new Date();

  const [{ totalSessions }] = await db
    .select({ totalSessions: sql<number>`count(*)::int` })
    .from(sessions);
  const [{ totalAttendees }] = await db
    .select({ totalAttendees: sql<number>`count(*)::int` })
    .from(users);
  const [{ totalCheckIns }] = await db
    .select({ totalCheckIns: sql<number>`count(*)::int` })
    .from(attendance);
  const [{ upcomingCount }] = await db
    .select({ upcomingCount: sql<number>`count(*)::int` })
    .from(sessions)
    .where(gte(sessions.startsAt, now));
  const [{ openTaskCount }] = await db
    .select({ openTaskCount: sql<number>`count(*)::int` })
    .from(tasks)
    .where(ne(tasks.status, "done"));
  const [{ avg }] = await db
    .select({ avg: sql<number>`coalesce(avg(${feedback.rating}), 0)::float` })
    .from(feedback);

  // Track breakdown
  const allSessions = await db.select().from(sessions);
  const ids: string[] = allSessions.map((s) => s.id);
  const counts = ids.length
    ? await db
        .select({
          sessionId: registrations.sessionId,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(registrations)
        .where(inArray(registrations.sessionId, ids))
        .groupBy(registrations.sessionId)
    : [];
  const countMap = new Map(counts.map((c) => [c.sessionId, c.count]));

  const tracks = ["lower", "middle", "upper", "all"] as const;
  const trackBreakdown = tracks.map((t) => {
    const list = allSessions.filter((s) => s.track === t);
    const reg = list.reduce((sum, s) => sum + (countMap.get(s.id) ?? 0), 0);
    return { track: t, sessionCount: list.length, registeredCount: reg };
  });

  let fullSessionsCount = 0;
  for (const s of allSessions) {
    if ((countMap.get(s.id) ?? 0) >= s.capacity) fullSessionsCount++;
  }

  // Next sessions
  const nextRows = await db
    .select()
    .from(sessions)
    .where(gte(sessions.startsAt, now))
    .orderBy(asc(sessions.startsAt))
    .limit(5);
  const myRegs = await db
    .select({ sessionId: registrations.sessionId })
    .from(registrations)
    .where(eq(registrations.userId, userId));
  const myRegSet = new Set(myRegs.map((r) => r.sessionId));
  const nextSessions = nextRows.map((s) => ({
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
    isRegistered: myRegSet.has(s.id),
  }));

  const notifs = await db
    .select({
      n: notifications,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(notifications)
    .leftJoin(users, eq(notifications.creatorId, users.id))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  res.json({
    totalSessions,
    totalAttendees,
    totalCheckIns,
    upcomingCount,
    fullSessionsCount,
    openTaskCount,
    averageRating: avg,
    unreadNotifications: notifs.map((r) => ({
      id: r.n.id,
      title: r.n.title,
      body: r.n.body,
      level: r.n.level,
      createdAt: r.n.createdAt.toISOString(),
      creatorId: r.n.creatorId,
      creatorName:
        [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
    })),
    trackBreakdown,
    nextSessions,
  });
});

export default router;
