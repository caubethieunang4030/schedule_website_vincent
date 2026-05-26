import { Router, type IRouter } from "express";
import { db, users } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { UpdateMeBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import { getUser } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

function ser(u: typeof users.$inferSelect) {
  return { ...u, createdAt: u.createdAt.toISOString() };
}

router.get("/me", async (req, res) => {
  const userId = getUser(req).userId;
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) { res.status(404).json({ error: "Not found" }); return; }
  res.json(ser(u));
});

router.patch("/me", async (req, res) => {
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
  res.json(ser(u));
});

router.get("/users", async (_req, res) => {
  const rows = await db.select().from(users).orderBy(asc(users.firstName));
  res.json(rows.map(ser));
});

export default router;
