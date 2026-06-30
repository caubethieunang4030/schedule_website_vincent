import type { Request, Response, NextFunction } from "express";
import { db, notifications, users } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateNotificationBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

export class NotificationsController {
  public async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await db
        .select({
          n: notifications,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(notifications)
        .leftJoin(users, eq(notifications.creatorId, users.id))
        .orderBy(desc(notifications.createdAt));
      res.json(
        rows.map((r) => ({
          id: r.n.id,
          title: r.n.title,
          body: r.n.body,
          level: r.n.level,
          createdAt: r.n.createdAt.toISOString(),
          creatorId: r.n.creatorId,
          creatorName:
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
        })),
      );
    } catch (error) {
      next(error);
    }
  }

  public async createNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateNotificationBody.parse(req.body);
      const [row] = await db
        .insert(notifications)
        .values({
          title: body.title,
          body: body.body,
          level: body.level,
          creatorId: getUser(req).userId,
        })
        .returning();
      res.status(201).json({
        id: row.id,
        title: row.title,
        body: row.body,
        level: row.level,
        createdAt: row.createdAt.toISOString(),
        creatorId: row.creatorId,
      });
    } catch (error) {
      next(error);
    }
  }
}
