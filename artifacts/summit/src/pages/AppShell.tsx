import { useUser, SignOutButton } from "@clerk/react";
import { Link, Switch, Route, useLocation } from "wouter";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CheckSquare,
  FileText,
  Bell,
  User as UserIcon,
  LogOut,
  Menu,
  Shield,
} from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import { useState } from "react";

import rabunGapLogo from "@assets/rabun-gap-logo-clear.png";
import Dashboard from "./app/Dashboard";
import Schedule from "./app/Schedule";
import SessionDetail from "./app/SessionDetail";
import MySchedule from "./app/MySchedule";
import Tasks from "./app/Tasks";
import FormsList from "./app/FormsList";
import FormBuilder from "./app/FormBuilder";
import FormView from "./app/FormView";
import Notifications from "./app/Notifications";
import Profile from "./app/Profile";
import AdminHome from "./app/AdminHome";
import AdminStudents from "./app/AdminStudents";
import AdminFeedback from "./app/AdminFeedback";

const ADMIN_ROLES = ["faculty", "organizer", "admin"];

export default function AppShell() {
  const { user } = useUser();
  const { data: me } = useGetMe();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(me?.role ?? "");

  const navItems = [
    { href: "/app", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/app/my-schedule", label: "My Schedule", icon: Calendar },
    { href: "/app/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/app/forms", label: "Forms", icon: FileText },
    { href: "/app/notifications", label: "Notifications", icon: Bell },
    ...(isAdmin
      ? [{ href: "/app/admin", label: "Admin", icon: Shield }]
      : []),
    { href: "/app/profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2 font-semibold">
          <img src={rabunGapLogo} alt="Rabun Gap" className="h-7 w-auto" />
          <span>Gap Summit</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "block" : "hidden"
        } md:block w-full md:w-64 border-r bg-card flex flex-col z-50 fixed md:static inset-0`}
      >
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 font-semibold text-lg">
          <div className="flex items-center gap-3">
            <img src={rabunGapLogo} alt="Rabun Gap" className="h-9 w-auto" />
            <span className="text-primary">Gap Summit</span>
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/app" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <SignOutButton>
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-auto">
        <Switch>
          <Route path="/app" component={Dashboard} />
          <Route path="/app/schedule" component={Schedule} />
          <Route path="/app/sessions/:id" component={SessionDetail} />
          <Route path="/app/my-schedule" component={MySchedule} />
          <Route path="/app/tasks" component={Tasks} />
          <Route path="/app/forms/new" component={FormBuilder} />
          <Route path="/app/forms/:id" component={FormView} />
          <Route path="/app/forms" component={FormsList} />
          <Route path="/app/notifications" component={Notifications} />
          {isAdmin && (
            <Route path="/app/admin/students" component={AdminStudents} />
          )}
          {isAdmin && (
            <Route path="/app/admin/feedback" component={AdminFeedback} />
          )}
          {isAdmin && <Route path="/app/admin" component={AdminHome} />}
          <Route path="/app/profile" component={Profile} />
        </Switch>
      </div>
    </div>
  );
}
