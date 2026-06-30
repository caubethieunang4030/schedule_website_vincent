import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { UpdateMeBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

function serializeUser(u: typeof users.$inferSelect) {
  return { ...u, createdAt: u.createdAt.toISOString() };
}

export class UsersController {
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      if (!u) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(serializeUser(u));
    } catch (error) {
      next(error);
    }
  }

  public async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      const body = UpdateMeBody.parse(req.body);
      const [u] = await db
        .update(users)
        .set({
          role: body.role ?? undefined,
          division: body.division ?? undefined,
        })
        .where(eq(users.id, userId))
        .returning();
      res.json(serializeUser(u));
    } catch (error) {
      next(error);
    }
  }

  public async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await db.select().from(users).orderBy(asc(users.firstName));
      res.json(rows.map(serializeUser));
    } catch (error) {
      next(error);
    }
  }
}
