import fs from "node:fs";
import path from "node:path";
import { db, users, sessions, tasks, notifications, forms, invitedStudents } from "@workspace/db";

// Load .env manually if process.env.DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    // Ignore env load errors
  }
}

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Seed Sample Users
  console.log("Creating users...");
  const sampleUsers = [
    {
      id: "user_admin_01",
      email: "admin@rabungap.org",
      firstName: "Vincent",
      lastName: "Admin",
      role: "admin",
      division: "all",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=VincentAdmin",
    },
    {
      id: "user_faculty_01",
      email: "teacher.smith@rabungap.org",
      firstName: "Sarah",
      lastName: "Smith",
      role: "faculty",
      division: "teachers",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SarahSmith",
    },
    {
      id: "user_student_01",
      email: "student.alex@student.rabungap.org",
      firstName: "Alex",
      lastName: "Johnson",
      role: "student",
      division: "upper",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexJohnson",
    },
  ];

  for (const user of sampleUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          division: user.division,
        },
      });
  }

  // 2. Seed Sample Sessions across all tracks
  console.log("Creating sessions...");
  const now = new Date();
  const todayAt8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const todayAt9AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const todayAt10AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const todayAt11AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0);
  const todayAt1PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0, 0);
  const todayAt2PM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);

  const sampleSessions = [
    {
      id: "session_keynote_01",
      title: "Learning Summit 2026: Opening Keynote & Key Vision",
      description: "Welcome address by Head of School & keynote on Innovation in K-12 Education.",
      location: "Main Campus",
      room: "Grand Auditorium",
      track: "required_all",
      mandatory: true,
      capacity: 600,
      startsAt: todayAt8AM,
      endsAt: todayAt9AM,
      organizers: ["Vincent Admin"],
      speakers: [{ name: "Dr. Elizabeth Vance", title: "Head of School", bio: "Educational Leader with 20+ yrs experience" }],
      tags: ["Keynote", "Plenary", "Mandatory"],
      createdBy: "user_admin_01",
    },
    {
      id: "session_stem_lower_01",
      title: "STEM Explorers: Hands-on Robotics & Coding",
      description: "Interactive session for Lower School students building their first LEGO robotics project.",
      location: "Lower School Wing",
      room: "Robotics Lab 101",
      track: "lower",
      mandatory: false,
      capacity: 35,
      startsAt: todayAt9AM,
      endsAt: todayAt10AM,
      organizers: ["Sarah Smith"],
      speakers: [{ name: "Mark Davis", title: "STEM Coordinator" }],
      tags: ["STEM", "Robotics", "Hands-on"],
      createdBy: "user_faculty_01",
    },
    {
      id: "session_ai_middle_01",
      title: "AI & Digital Ethics in Daily School Life",
      description: "Understanding artificial intelligence tools, prompt engineering, and digital ethics for Middle Schoolers.",
      location: "Middle School Building",
      room: "Room 204",
      track: "middle",
      mandatory: false,
      capacity: 45,
      startsAt: todayAt10AM,
      endsAt: todayAt11AM,
      organizers: ["Vincent Admin"],
      speakers: [{ name: "Elena Rostova", title: "Tech Integrator" }],
      tags: ["AI", "Digital Ethics", "Interactive"],
      createdBy: "user_admin_01",
    },
    {
      id: "session_web_upper_01",
      title: "Full-Stack Web Development & Modern App Architecture",
      description: "Deep dive into TypeScript, Vite, React, Express, and Database design for Upper School developers.",
      location: "Innovation Hub",
      room: "Tech Center Lab B",
      track: "upper",
      mandatory: false,
      capacity: 40,
      startsAt: todayAt1PM,
      endsAt: todayAt2PM,
      organizers: ["Vincent Admin"],
      speakers: [{ name: "Vincent Huynh", title: "Lead Software Architect" }],
      tags: ["Web Dev", "Coding", "Upper School"],
      createdBy: "user_admin_01",
    },
    {
      id: "session_faculty_edtech_01",
      title: "Faculty Workshop: AI-Assisted Lesson Planning",
      description: "Exclusive workshop for teachers on streamlining grading and creating personalized learning paths.",
      location: "Faculty Lounge",
      room: "Conference Room A",
      track: "teachers",
      mandatory: false,
      capacity: 30,
      startsAt: todayAt1PM,
      endsAt: todayAt2PM,
      organizers: ["Sarah Smith"],
      speakers: [{ name: "Sarah Smith", title: "Department Chair" }],
      tags: ["Faculty", "EdTech", "Professional Development"],
      createdBy: "user_faculty_01",
    },
    {
      id: "session_design_all_01",
      title: "Creative Design Thinking & Problem Solving",
      description: "Cross-grade interactive workshop on UI/UX design thinking principles.",
      location: "Arts Center",
      room: "Design Studio 3",
      track: "all",
      mandatory: false,
      capacity: 50,
      startsAt: todayAt10AM,
      endsAt: todayAt11AM,
      organizers: ["Vincent Admin"],
      speakers: [{ name: "Chloe Bennett", title: "UI/UX Designer" }],
      tags: ["Design", "Creativity", "All Divisions"],
      createdBy: "user_admin_01",
    },
  ];

  for (const session of sampleSessions) {
    await db
      .insert(sessions)
      .values(session)
      .onConflictDoUpdate({
        target: sessions.id,
        set: {
          title: session.title,
          description: session.description,
          location: session.location,
          room: session.room,
          track: session.track,
          capacity: session.capacity,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          tags: session.tags,
        },
      });
  }

  // 3. Seed Sample Notifications
  console.log("Creating notifications...");
  await db
    .insert(notifications)
    .values([
      {
        id: "notif_welcome_01",
        title: "🎉 Welcome to Learning Summit 2026!",
        body: "Please make sure to check in at the Main Auditorium by 8:00 AM for the Opening Keynote.",
        level: "info",
        creatorId: "user_admin_01",
      },
      {
        id: "notif_qr_reminder_02",
        title: "📱 Ready your QR Code for Check-in",
        body: "Have your My Schedule QR Code open on your mobile device for rapid scan at each session entrance.",
        level: "warning",
        creatorId: "user_admin_01",
      },
    ])
    .onConflictDoNothing();

  // 4. Seed Sample Tasks
  console.log("Creating tasks...");
  await db
    .insert(tasks)
    .values([
      {
        id: "task_qr_prep_01",
        title: "Set up QR Scanning Stations at Main Auditorium",
        description: "Verify iPads and mobile scanners are connected to Wi-Fi and logged into Admin Check-in.",
        assigneeId: "user_admin_01",
        status: "in_progress",
        category: "daily_group_dump",
        priority: "urgent",
        seasonYear: "2025-2026",
        createdBy: "user_admin_01",
      },
      {
        id: "task_roster_import_02",
        title: "Final Roster Sync & Student Email Allowlist Check",
        description: "Ensure all newly enrolled students are imported via CSV in Admin > Roster.",
        assigneeId: "user_faculty_01",
        status: "todo",
        category: "personal_prep",
        priority: "high",
        seasonYear: "2025-2026",
        createdBy: "user_admin_01",
      },
    ])
    .onConflictDoNothing();

  // 5. Seed Sample Forms
  console.log("Creating sample forms...");
  await db
    .insert(forms)
    .values([
      {
        id: "form_summit_feedback_01",
        title: "Overall Learning Summit Feedback Form",
        description: "Help us improve future summits by sharing your thoughts on session quality and organization.",
        sessionId: "session_keynote_01",
        fields: [
          { key: "q1_satisfaction", label: "Overall Satisfaction Rate", type: "select", required: true, options: ["Excellent", "Good", "Average", "Needs Improvement"] },
          { key: "q2_comments", label: "What was your favorite session or takeaway?", type: "textarea", required: false },
        ],
        creatorId: "user_admin_01",
      },
    ])
    .onConflictDoNothing();

  // 6. Seed Sample Roster / Invited Students
  console.log("Creating invited students roster...");
  await db
    .insert(invitedStudents)
    .values([
      { id: "invited_01", email: "student.alex@student.rabungap.org", firstName: "Alex", lastName: "Johnson", division: "upper" },
      { id: "invited_02", email: "student.emma@student.rabungap.org", firstName: "Emma", lastName: "Watson", division: "middle" },
      { id: "invited_03", email: "student.liam@student.rabungap.org", firstName: "Liam", lastName: "Brown", division: "lower" },
    ])
    .onConflictDoNothing();

  console.log("✅ Database seeding completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error seeding database:", err);
  process.exit(1);
});
