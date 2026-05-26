import { Link } from "wouter";
import { Users, MessageSquare, ListTodo, Bell, CalendarDays } from "lucide-react";

const tiles = [
  {
    href: "/app/admin/students",
    label: "Students",
    desc: "Import a roster (CSV/Excel) and track who's registered.",
    icon: Users,
  },
  {
    href: "/app/admin/feedback",
    label: "Feedback",
    desc: "Aggregated ratings and comments across every session.",
    icon: MessageSquare,
  },
  {
    href: "/app/tasks",
    label: "Tasks & Assignments",
    desc: "Assign tasks to students and faculty, export to Excel.",
    icon: ListTodo,
  },
  {
    href: "/app/notifications",
    label: "Announcements",
    desc: "Broadcast info, warnings, and emergency alerts.",
    icon: Bell,
  },
  {
    href: "/app/schedule",
    label: "Schedule",
    desc: "Browse the summit schedule across every track.",
    icon: CalendarDays,
  },
];

export default function AdminHome() {
  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-lg">
          Coordinate the summit — students, feedback, tasks, and announcements.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <div className="bg-card border rounded-2xl p-6 h-full flex flex-col gap-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
              <t.icon className="w-8 h-8 text-primary" />
              <div className="font-semibold text-lg">{t.label}</div>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
