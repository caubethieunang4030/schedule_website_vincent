import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

const cuid = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // clerk user id
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    imageUrl: text("image_url"),
    role: text("role").notNull().default("student"), // student | faculty | organizer | admin
    division: text("division").notNull().default("all"), // lower | middle | upper | all
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: cuid(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    room: text("room").notNull().default(""),
    track: text("track").notNull().default("all"),
    mandatory: boolean("mandatory").notNull().default(false),
    capacity: integer("capacity").notNull().default(30),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    organizers: jsonb("organizers")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    speakers: jsonb("speakers")
      .$type<{ name: string; title?: string | null; bio?: string | null }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    tags: jsonb("tags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    trackIdx: index("sessions_track_idx").on(t.track),
    startsAtIdx: index("sessions_starts_at_idx").on(t.startsAt),
  }),
);

export const registrations = pgTable(
  "registrations",
  {
    id: cuid(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("registrations_session_user_idx").on(
      t.sessionId,
      t.userId,
    ),
  }),
);

export const attendance = pgTable(
  "attendance",
  {
    id: cuid(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull().default("qr"), // qr | room
    checkedInAt: timestamp("checked_in_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("attendance_session_user_idx").on(t.sessionId, t.userId),
  }),
);

export const feedback = pgTable("feedback", {
  id: cuid(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: cuid(),
  title: text("title").notNull(),
  description: text("description"),
  assigneeId: text("assignee_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("todo"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const forms = pgTable("forms", {
  id: cuid(),
  title: text("title").notNull(),
  description: text("description"),
  sessionId: text("session_id"),
  fields: jsonb("fields")
    .$type<
      {
        key: string;
        label: string;
        type: "text" | "textarea" | "number" | "select" | "checkbox";
        required: boolean;
        options?: string[];
      }[]
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const formResponses = pgTable("form_responses", {
  id: cuid(),
  formId: text("form_id")
    .notNull()
    .references(() => forms.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  values: jsonb("values")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invitedStudents = pgTable(
  "invited_students",
  {
    id: cuid(),
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    division: text("division").notNull().default("all"), // lower | middle | upper | all | required_all | teachers
    invitedBy: text("invited_by"),
    invitedAt: timestamp("invited_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("invited_students_email_idx").on(t.email),
  }),
);

export const notifications = pgTable("notifications", {
  id: cuid(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  level: text("level").notNull().default("info"), // info | warning | emergency
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertFormSchema = createInsertSchema(forms);
export const insertNotificationSchema = createInsertSchema(notifications);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Form = typeof forms.$inferSelect;
export type FormResponse = typeof formResponses.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InvitedStudent = typeof invitedStudents.$inferSelect;
