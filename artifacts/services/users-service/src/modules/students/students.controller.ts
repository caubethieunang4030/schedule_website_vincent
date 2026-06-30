import type { Request, Response, NextFunction } from "express";
import { db, invitedStudents, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { ImportInvitedStudentsBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

export class StudentsController {
  public async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await db
        .select({
          id: invitedStudents.id,
          email: invitedStudents.email,
          firstName: invitedStudents.firstName,
          lastName: invitedStudents.lastName,
          division: invitedStudents.division,
          invitedAt: invitedStudents.invitedAt,
          userCreatedAt: users.createdAt,
        })
        .from(invitedStudents)
        .leftJoin(
          users,
          sql`lower(${users.email}) = lower(${invitedStudents.email})`,
        )
        .orderBy(invitedStudents.email);

      res.json(
        rows.map((r) => ({
          id: r.id,
          email: r.email,
          firstName: r.firstName,
          lastName: r.lastName,
          division: r.division,
          registered: !!r.userCreatedAt,
          registeredAt: r.userCreatedAt?.toISOString() ?? null,
          invitedAt: r.invitedAt.toISOString(),
        })),
      );
    } catch (error) {
      next(error);
    }
  }

  public async importStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ImportInvitedStudentsBody.parse(req.body);
      const userId = getUser(req).userId;
      const seen = new Set<string>();
      const rows = body.rows
        .map((r) => ({
          ...r,
          email: String(r.email || "").trim().toLowerCase(),
        }))
        .filter((r) => {
          if (!r.email || !r.email.includes("@")) return false;
          if (seen.has(r.email)) return false;
          seen.add(r.email);
          return true;
        });

      if (rows.length === 0) {
        res.json({ inserted: 0, skipped: body.rows.length });
        return;
      }

      const before = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invitedStudents);
      const beforeCount = Number(before[0]?.count ?? 0);

      await db
        .insert(invitedStudents)
        .values(
          rows.map((r) => ({
            email: r.email,
            firstName: r.firstName ?? null,
            lastName: r.lastName ?? null,
            division: r.division ?? "all",
            invitedBy: userId,
          })),
        )
        .onConflictDoNothing({ target: invitedStudents.email });

      const after = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invitedStudents);
      const afterCount = Number(after[0]?.count ?? 0);
      const inserted = afterCount - beforeCount;

      res.json({
        inserted,
        skipped: body.rows.length - inserted,
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await db
        .delete(invitedStudents)
        .where(eq(invitedStudents.id, String(req.params.id)));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
}
