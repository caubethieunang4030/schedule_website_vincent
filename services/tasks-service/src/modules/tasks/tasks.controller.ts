import type { Request, Response, NextFunction } from "express";
import { db, tasks, taskChecklists, users, sessions, registrations, attendance } from "@workspace/db";
import { eq, sql, inArray, desc, asc } from "drizzle-orm";
import { CreateTaskBody, UpdateTaskBody, CreateTaskChecklistBody, UpdateTaskChecklistBody } from "@workspace/api-zod";
import { getUser } from "../../lib/auth";

function serializeTask(
  t: typeof tasks.$inferSelect,
  u?: { firstName: string | null; lastName: string | null; email: string },
  checklists: (typeof taskChecklists.$inferSelect)[] = []
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
    category: t.category,
    priority: t.priority,
    seasonYear: t.seasonYear,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdBy: t.createdBy ?? null,
    checklists: checklists.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      title: c.title,
      isCompleted: c.isCompleted,
      order: c.order,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export class TasksController {
  public async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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

      const taskIds = rows.map((r) => r.task.id);
      const allChecklists = taskIds.length
        ? await db
            .select()
            .from(taskChecklists)
            .where(inArray(taskChecklists.taskId, taskIds))
            .orderBy(asc(taskChecklists.order), asc(taskChecklists.createdAt))
        : [];

      const checklistMap = new Map<string, (typeof taskChecklists.$inferSelect)[]>();
      for (const item of allChecklists) {
        if (!checklistMap.has(item.taskId)) {
          checklistMap.set(item.taskId, []);
        }
        checklistMap.get(item.taskId)!.push(item);
      }

      res.json(
        rows.map((r) =>
          serializeTask(
            r.task,
            r.email
              ? { firstName: r.firstName, lastName: r.lastName, email: r.email }
              : undefined,
            checklistMap.get(r.task.id) ?? []
          ),
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  public async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateTaskBody.parse(req.body);
      const currentUser = getUser(req);

      const [row] = await db
        .insert(tasks)
        .values({
          title: body.title,
          description: body.description ?? null,
          assigneeId: body.assigneeId || currentUser.userId,
          status: body.status ?? "todo",
          category: body.category ?? "general",
          priority: body.priority ?? "medium",
          seasonYear: body.seasonYear ?? "2025-2026",
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
          createdBy: currentUser.userId,
        })
        .returning();

      let createdChecklists: (typeof taskChecklists.$inferSelect)[] = [];
      if (body.initialChecklist && body.initialChecklist.length > 0) {
        createdChecklists = await db
          .insert(taskChecklists)
          .values(
            body.initialChecklist.map((title, index) => ({
              taskId: row.id,
              title,
              isCompleted: false,
              order: index,
            }))
          )
          .returning();
      }

      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.id, row.assigneeId));
      res.status(201).json(serializeTask(row, u, createdChecklists));
    } catch (error) {
      next(error);
    }
  }

  public async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const body = UpdateTaskBody.parse(req.body);
      const update: Partial<typeof tasks.$inferInsert> = {};
      if (body.title !== undefined) update.title = body.title;
      if (body.description !== undefined) update.description = body.description;
      if (body.assigneeId !== undefined) update.assigneeId = body.assigneeId;
      if (body.category !== undefined) update.category = body.category;
      if (body.priority !== undefined) update.priority = body.priority;
      if (body.seasonYear !== undefined) update.seasonYear = body.seasonYear;
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
      if (!row) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const items = await db
        .select()
        .from(taskChecklists)
        .where(eq(taskChecklists.taskId, row.id))
        .orderBy(asc(taskChecklists.order));
      const [u] = await db.select().from(users).where(eq(users.id, row.assigneeId));
      res.json(serializeTask(row, u, items));
    } catch (error) {
      next(error);
    }
  }

  public async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await db.delete(tasks).where(eq(tasks.id, String(req.params.id)));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  public async createChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskId = String(req.params.id);
      const body = CreateTaskChecklistBody.parse(req.body);
      const [item] = await db
        .insert(taskChecklists)
        .values({
          taskId,
          title: body.title,
          isCompleted: false,
        })
        .returning();
      res.status(201).json({
        id: item.id,
        taskId: item.taskId,
        title: item.title,
        isCompleted: item.isCompleted,
        order: item.order,
        createdAt: item.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checklistId = String(req.params.checklistId);
      const body = UpdateTaskChecklistBody.parse(req.body);
      const update: Partial<typeof taskChecklists.$inferInsert> = {};
      if (body.title !== undefined) update.title = body.title;
      if (body.isCompleted !== undefined) update.isCompleted = body.isCompleted;

      const [item] = await db
        .update(taskChecklists)
        .set(update)
        .where(eq(taskChecklists.id, checklistId))
        .returning();

      if (!item) {
        res.status(404).json({ error: "Checklist item not found" });
        return;
      }
      res.json({
        id: item.id,
        taskId: item.taskId,
        title: item.title,
        isCompleted: item.isCompleted,
        order: item.order,
        createdAt: item.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteChecklist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const checklistId = String(req.params.checklistId);
      await db.delete(taskChecklists).where(eq(taskChecklists.id, checklistId));
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  public async exportTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
        category: r.task.category,
        priority: r.task.priority,
        seasonYear: r.task.seasonYear,
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
    } catch (error) {
      next(error);
    }
  }
}
