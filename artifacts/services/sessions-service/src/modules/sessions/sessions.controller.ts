import type { Request, Response, NextFunction } from "express";
import { db, sessions, registrations, users, attendance } from "@workspace/db";
import { eq, sql, inArray, asc } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionBody,
  ListSessionsQueryParams,
} from "@workspace/api-zod";
import { createEvents, type EventAttributes } from "ics";
import { getUser } from "../../lib/auth";

function simpleHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

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

export class SessionsController {
  public async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { track } = ListSessionsQueryParams.parse(req.query);
      const out = await getDecoratedSessions(getUser(req).userId, track);
      res.json(out);
    } catch (error) {
      next(error);
    }
  }

  public async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  public async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const decorated = await getDecoratedSessionById(id, getUser(req).userId);
      if (!decorated) {
        res.status(404).json({ error: "Not found" });
        return;
      }
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
    } catch (error) {
      next(error);
    }
  }

  public async updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const decorated = await getDecoratedSessionById(row.id, getUser(req).userId);
      res.json(decorated);
    } catch (error) {
      next(error);
    }
  }

  public async deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.id, String(req.params.id)));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  public async registerSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    const userId = getUser(req).userId;
    const sid = String(req.params.id);

    try {
      const result = await db.transaction(async (tx) => {
        const [session] = await tx
          .select({ capacity: sessions.capacity })
          .from(sessions)
          .where(eq(sessions.id, sid))
          .for("update");

        if (!session) {
          return { status: 404, error: "Session not found" };
        }

        const [{ count }] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(registrations)
          .where(eq(registrations.sessionId, sid));

        if (count >= session.capacity) {
          return { status: 409, error: "Session is full" };
        }

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
      try {
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
      } catch (innerErr) {
        next(innerErr);
      }
    }
  }

  public async unregisterSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      await db
        .delete(registrations)
        .where(
          sql`${registrations.sessionId} = ${String(req.params.id)} AND ${registrations.userId} = ${userId}`,
        );
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  public async checkinSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = getUser(req);
      const sid = String(req.params.id);
      const method = req.body?.method === "room" ? "room" : "qr";
      
      let userId: string;
      if (method === "qr") {
        // Enforce permissions: Only faculty, organizer, or admin can scan QR codes to check in others
        if (
          authUser.userRole !== "faculty" &&
          authUser.userRole !== "organizer" &&
          authUser.userRole !== "admin"
        ) {
          res.status(403).json({ error: "Forbidden - Only faculty, organizers, or admins can scan QR codes to check in attendees" });
          return;
        }
        
        const studentId = req.body?.code;
        const ts = Number(req.body?.ts);
        const signature = req.body?.signature;
        const qrSessionId = req.body?.sessionId;

        if (!studentId || !ts || !signature) {
          res.status(400).json({ error: "Invalid QR code payload" });
          return;
        }

        // 1. Verify dynamic signature
        let expectedSignature: string;
        if (qrSessionId) {
          if (qrSessionId !== sid) {
            res.status(400).json({ error: "QR code belongs to a different session" });
            return;
          }
          expectedSignature = simpleHash(studentId + sid + ts + "VINCENT_QR_SECRET_SALT");
        } else {
          expectedSignature = simpleHash(studentId + ts + "VINCENT_QR_SECRET_SALT");
        }

        if (signature !== expectedSignature) {
          res.status(400).json({ error: "Invalid or forged QR code signature" });
          return;
        }

        // 2. Verify timestamp freshness (allow max 20 seconds difference to account for network lag)
        if (Math.abs(Date.now() - ts) > 20000) {
          res.status(400).json({ error: "QR code has expired. Please refresh the QR code." });
          return;
        }
        
        userId = studentId;
      } else {
        // Self-check-in using room method
        userId = authUser.userId;
      }

      const [session] = await db.select().from(sessions).where(eq(sessions.id, sid));
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

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
        if (!existing) {
          res.status(500).json({ error: "Could not check in" });
          return;
        }
        res.json({
          id: existing.id,
          sessionId: existing.sessionId,
          userId: existing.userId,
          method: existing.method,
          checkedInAt: existing.checkedInAt.toISOString(),
        });
      }
    } catch (error) {
      next(error);
    }
  }

  public async getAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  public async getMyRegistrations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  public async exportCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      const rows = await db
        .select({
          id: sessions.id,
          title: sessions.title,
          description: sessions.description,
          location: sessions.location,
          room: sessions.room,
          startsAt: sessions.startsAt,
          endsAt: sessions.endsAt,
        })
        .from(sessions)
        .innerJoin(registrations, eq(sessions.id, registrations.sessionId))
        .where(eq(registrations.userId, userId))
        .orderBy(asc(sessions.startsAt));

      const events: EventAttributes[] = rows.map((s) => {
        const start = new Date(s.startsAt);
        const end = new Date(s.endsAt);
        return {
          start: [
            start.getFullYear(),
            start.getMonth() + 1,
            start.getDate(),
            start.getHours(),
            start.getMinutes(),
          ],
          end: [
            end.getFullYear(),
            end.getMonth() + 1,
            end.getDate(),
            end.getHours(),
            end.getMinutes(),
          ],
          title: s.title,
          description: s.description ?? "Learning Summit Session",
          location: s.room ? `${s.room} (${s.location ?? ""})` : (s.location ?? "Online"),
        };
      });

      if (events.length === 0) {
        res.setHeader("Content-Type", "text/calendar");
        res.setHeader("Content-Disposition", 'attachment; filename="summit-schedule.ics"');
        res.send("BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Our Calendar//EN\nEND:VCALENDAR");
        return;
      }

      createEvents(events, (error, value) => {
        if (error) {
          res.status(500).json({ error: "Failed to generate calendar file" });
          return;
        }
        res.setHeader("Content-Type", "text/calendar");
        res.setHeader("Content-Disposition", 'attachment; filename="summit-schedule.ics"');
        res.send(value);
      });
    } catch (error) {
      next(error);
    }
  }
}
