import {
  db,
  users,
  sessions,
  tasks,
  notifications,
  forms,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding…");

  // Demo users (will be overwritten by Clerk on first login).
  const demoUsers = [
    {
      id: "seed-org",
      email: "events@school.edu",
      firstName: "Sam",
      lastName: "Reyes",
      role: "organizer",
      division: "all",
    },
    {
      id: "seed-fac",
      email: "mariam.khan@school.edu",
      firstName: "Mariam",
      lastName: "Khan",
      role: "faculty",
      division: "upper",
    },
    {
      id: "seed-stu",
      email: "alex.li@school.edu",
      firstName: "Alex",
      lastName: "Li",
      role: "student",
      division: "middle",
    },
  ];

  for (const u of demoUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.id,
        set: { role: u.role, division: u.division },
      });
  }

  const day = new Date();
  day.setHours(9, 0, 0, 0);
  const at = (h: number, m = 0) => {
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const sessionRows = [
    {
      title: "Opening Keynote: Curiosity in the Age of AI",
      description:
        "A community-wide kickoff with stories from alumni working at the frontier of education and technology.",
      location: "Main Auditorium",
      room: "Aud-101",
      track: "all",
      mandatory: true,
      capacity: 600,
      startsAt: at(9),
      endsAt: at(10),
      organizers: ["seed-org"],
      speakers: [
        { name: "Dr. Lena Cho", title: "Head of School", bio: "" },
        { name: "Marcus Hayes", title: "Alumnus, ML Researcher", bio: "" },
      ],
      tags: ["keynote", "all-school"],
      createdBy: "seed-org",
    },
    {
      title: "Storytelling Workshop",
      description:
        "Hands-on workshop helping Lower School students craft a short story from start to finish.",
      location: "Lower Library",
      room: "L-204",
      track: "lower",
      mandatory: false,
      capacity: 24,
      startsAt: at(10, 30),
      endsAt: at(11, 30),
      organizers: ["seed-fac"],
      speakers: [{ name: "Mariam Khan", title: "English Faculty" }],
      tags: ["writing", "creative"],
      createdBy: "seed-org",
    },
    {
      title: "Robotics Build Lab",
      description:
        "Build and program a small autonomous rover. Bring a partner.",
      location: "Maker Space",
      room: "M-110",
      track: "middle",
      mandatory: false,
      capacity: 20,
      startsAt: at(10, 30),
      endsAt: at(12),
      organizers: ["seed-fac"],
      speakers: [{ name: "Devon Ross", title: "STEM Faculty" }],
      tags: ["stem", "robotics"],
      createdBy: "seed-org",
    },
    {
      title: "College Essays That Sound Like You",
      description:
        "An interactive seminar for Upper School students writing personal statements.",
      location: "Senior Lounge",
      room: "U-301",
      track: "upper",
      mandatory: false,
      capacity: 35,
      startsAt: at(13),
      endsAt: at(14, 30),
      organizers: ["seed-org"],
      speakers: [{ name: "Mariam Khan", title: "English Faculty" }],
      tags: ["college", "writing"],
      createdBy: "seed-org",
    },
    {
      title: "Closing Reflections & Awards",
      description:
        "Wrap-up of the day with student reflections and recognition.",
      location: "Main Auditorium",
      room: "Aud-101",
      track: "all",
      mandatory: true,
      capacity: 600,
      startsAt: at(15, 30),
      endsAt: at(16, 30),
      organizers: ["seed-org"],
      speakers: [{ name: "Dr. Lena Cho", title: "Head of School" }],
      tags: ["closing"],
      createdBy: "seed-org",
    },
  ];

  await db.delete(sessions);
  await db.insert(sessions).values(sessionRows);

  await db.delete(tasks);
  await db.insert(tasks).values([
    {
      title: "Confirm AV setup in Main Auditorium",
      description: "Test mic levels and projector before 8:30am.",
      assigneeId: "seed-fac",
      status: "in_progress",
      dueAt: at(8, 30),
      createdBy: "seed-org",
    },
    {
      title: "Print attendee badges",
      description: "Pickup from print shop, distribute at front desk.",
      assigneeId: "seed-org",
      status: "todo",
      dueAt: at(8),
      createdBy: "seed-org",
    },
    {
      title: "Coordinate lunch delivery",
      description: "Delivery between sessions, room U-301.",
      assigneeId: "seed-org",
      status: "todo",
      dueAt: at(11, 45),
      createdBy: "seed-org",
    },
  ]);

  await db.delete(notifications);
  await db.insert(notifications).values([
    {
      title: "Welcome to the Learning Summit",
      body: "Sessions begin at 9:00 AM in the Main Auditorium. Check the schedule for your assigned track.",
      level: "info",
      creatorId: "seed-org",
    },
    {
      title: "Maker Space relocated",
      body: "Robotics Build Lab moved from M-110 to M-115 for capacity reasons.",
      level: "warning",
      creatorId: "seed-org",
    },
  ]);

  await db.delete(forms);
  await db.insert(forms).values([
    {
      title: "End of Summit Reflection",
      description:
        "Help us improve next year's summit by sharing your honest feedback.",
      sessionId: null,
      fields: [
        {
          key: "favorite",
          label: "Which session resonated with you most?",
          type: "text",
          required: true,
        },
        {
          key: "rating",
          label: "Overall, how would you rate the day? (1-5)",
          type: "number",
          required: true,
        },
        {
          key: "improve",
          label: "What should we do differently next year?",
          type: "textarea",
          required: false,
        },
        {
          key: "track",
          label: "Which division are you in?",
          type: "select",
          required: true,
          options: ["Lower", "Middle", "Upper", "Faculty"],
        },
      ],
      creatorId: "seed-org",
    },
  ]);

  await db.execute(sql`select 1`);
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
