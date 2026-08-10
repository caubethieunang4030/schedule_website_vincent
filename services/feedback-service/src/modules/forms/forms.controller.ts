import type { Request, Response, NextFunction } from "express";
import { db, forms, formResponses, users } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { CreateFormBody, SubmitFormResponseBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

export class FormsController {
  public async listForms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await db
        .select({ form: forms, firstName: users.firstName, lastName: users.lastName })
        .from(forms)
        .leftJoin(users, eq(forms.creatorId, users.id))
        .orderBy(desc(forms.createdAt));

      const ids: string[] = rows.map((r) => r.form.id);
      const counts = ids.length
        ? await db
            .select({
              formId: formResponses.formId,
              count: sql<number>`count(*)::int`.as("count"),
            })
            .from(formResponses)
            .where(inArray(formResponses.formId, ids))
            .groupBy(formResponses.formId)
        : [];
      const countMap = new Map(counts.map((c) => [c.formId, c.count]));

      res.json(
        rows.map((r) => ({
          id: r.form.id,
          title: r.form.title,
          description: r.form.description ?? null,
          sessionId: r.form.sessionId ?? null,
          creatorId: r.form.creatorId,
          creatorName:
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
          responseCount: countMap.get(r.form.id) ?? 0,
          createdAt: r.form.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      next(error);
    }
  }

  public async createForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateFormBody.parse(req.body);
      const [row] = await db
        .insert(forms)
        .values({
          title: body.title,
          description: body.description ?? null,
          sessionId: body.sessionId ?? null,
          fields: body.fields,
          creatorId: getUser(req).userId,
        })
        .returning();
      res.status(201).json({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        sessionId: row.sessionId ?? null,
        creatorId: row.creatorId,
        responseCount: 0,
        createdAt: row.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async getFormById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [row] = await db.select().from(forms).where(eq(forms.id, String(req.params.id)));
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(formResponses)
        .where(eq(formResponses.formId, row.id));
      res.json({
        id: row.id,
        title: row.title,
        description: row.description ?? null,
        sessionId: row.sessionId ?? null,
        creatorId: row.creatorId,
        fields: row.fields ?? [],
        responseCount: count,
        createdAt: row.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async submitFormResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUser(req).userId;
      const body = SubmitFormResponseBody.parse(req.body);
      const [row] = await db
        .insert(formResponses)
        .values({
          formId: String(req.params.id),
          userId,
          values: body.values as Record<string, unknown>,
        })
        .returning();
      res.status(201).json({
        id: row.id,
        formId: row.formId,
        userId: row.userId,
        values: row.values ?? {},
        createdAt: row.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async listFormResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rows = await db
        .select({
          r: formResponses,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(formResponses)
        .leftJoin(users, eq(formResponses.userId, users.id))
        .where(eq(formResponses.formId, String(req.params.id)))
        .orderBy(desc(formResponses.createdAt));
      res.json(
        rows.map((r) => ({
          id: r.r.id,
          formId: r.r.formId,
          userId: r.r.userId,
          userName:
            [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null,
          values: r.r.values ?? {},
          createdAt: r.r.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      next(error);
    }
  }
}
