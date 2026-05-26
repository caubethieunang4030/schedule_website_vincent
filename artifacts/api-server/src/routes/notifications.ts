import { Router, type IRouter } from "express";
import { db, notifications, users } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateNotificationBody } from "@workspace/api-zod";
import { requireAuth, requireRole } from "../lib/auth";
import { getUser } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/notifications", async (_req, res) => {
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
});

router.post(
  "/notifications",
  requireRole("faculty", "organizer", "admin"),
  async (req, res) => {
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
  },
);

export default router;
