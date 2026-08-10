import type { Request, Response, NextFunction } from "express";
import { db, feedback, sessions, users } from "@workspace/db";
import { eq, desc, sql, isNotNull } from "drizzle-orm";
import { SubmitFeedbackBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

export class FeedbackController {
  public async getFeedbackAggregate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const grouped = await db
        .select({
          sessionId: sessions.id,
          sessionTitle: sessions.title,
          track: sessions.track,
          startsAt: sessions.startsAt,
          averageRating: sql<number>`coalesce(avg(${feedback.rating}), 0)::float`,
          count: sql<number>`count(${feedback.id})::int`,
        })
        .from(sessions)
        .leftJoin(feedback, eq(feedback.sessionId, sessions.id))
        .groupBy(sessions.id)
        .orderBy(desc(sessions.startsAt));

      const sessionIds = grouped.map((g) => g.sessionId);
      type Row = {
        sessionId: string;
        comment: string | null;
        rating: number;
        createdAt: Date;
        firstName: string | null;
        lastName: string | null;
      };
      let comments: Row[] = [];
      if (sessionIds.length > 0) {
        comments = await db
          .select({
            sessionId: feedback.sessionId,
            comment: feedback.comment,
            rating: feedback.rating,
            createdAt: feedback.createdAt,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(feedback)
          .leftJoin(users, eq(feedback.userId, users.id))
          .where(isNotNull(feedback.comment))
          .orderBy(desc(feedback.createdAt));
      }

      const commentsBySession = new Map<string, Row[]>();
      for (const c of comments) {
        const list = commentsBySession.get(c.sessionId) ?? [];
        if (list.length < 5) list.push(c);
        commentsBySession.set(c.sessionId, list);
      }

      res.json(
        grouped
          .filter((g) => Number(g.count) > 0)
          .map((g) => ({
            sessionId: g.sessionId,
            sessionTitle: g.sessionTitle,
            track: g.track,
            startsAt: g.startsAt.toISOString(),
            averageRating: Number(g.averageRating),
            count: Number(g.count),
            recentComments: (commentsBySession.get(g.sessionId) ?? []).map(
              (c) => ({
                comment: c.comment ?? "",
                userName:
                  [c.firstName, c.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || null,
                rating: c.rating,
                createdAt: c.createdAt.toISOString(),
              }),
            ),
          })),
      );
    } catch (error) {
      next(error);
    }
  }

  public async getSessionFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sid = String(req.params.id);
      const rows = await db
        .select({
          id: feedback.id,
          sessionId: feedback.sessionId,
          userId: feedback.userId,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(feedback)
        .leftJoin(users, eq(feedback.userId, users.id))
        .where(eq(feedback.sessionId, sid))
        .orderBy(desc(feedback.createdAt));
      const items = rows.map((r) => ({
        id: r.id,
        sessionId: r.sessionId,
        userId: r.userId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        userName:
          [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
      }));
      const averageRating =
        items.length === 0
          ? 0
          : items.reduce((s, i) => s + i.rating, 0) / items.length;
      res.json({ averageRating, count: items.length, items });
    } catch (error) {
      next(error);
    }
  }

  public async createSessionFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      const sid = String(req.params.id);
      const body = SubmitFeedbackBody.parse(req.body);
      const [row] = await db
        .insert(feedback)
        .values({
          sessionId: sid,
          userId,
          rating: body.rating,
          comment: body.comment ?? null,
        })
        .returning();
      res.status(201).json({
        id: row.id,
        sessionId: row.sessionId,
        userId: row.userId,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
