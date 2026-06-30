import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const ALLOWED_DOMAINS = [".edu", ".org"];

function isSchoolEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ALLOWED_DOMAINS.some((d) => lower.endsWith(d));
}

interface AuthState {
  userId: string;
  userRole: string;
  userEmail: string;
}

const authStates = new WeakMap<Request, AuthState>();

export function getUser(req: Request): AuthState {
  const s = authStates.get(req);
  if (!s) throw new Error("Auth state missing — requireAuth not applied");
  return s;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    const testUserId = "seed-org";
    const [user] = await db.select().from(users).where(eq(users.id, testUserId));
    if (user) {
      authStates.set(req, {
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
      });
      next();
      return;
    }
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(userId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      "";

    if (!email || !isSchoolEmail(email)) {
      res.status(403).json({
        error:
          "Access restricted to school email addresses (.edu or .org). Please sign in with a valid account.",
      });
      return;
    }

    [user] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        imageUrl: clerkUser.imageUrl ?? null,
        role: "student",
        division: "all",
      })
      .returning();
  } else if (!isSchoolEmail(user.email)) {
    res
      .status(403)
      .json({ error: "Access restricted to .edu or .org email addresses." });
    return;
  }

  authStates.set(req, {
    userId,
    userRole: user.role,
    userEmail: user.email,
  });
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const state = authStates.get(req);
    const role = state?.userRole ?? "";
    if (!roles.includes(role) && role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
