import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Users, Calendar, CheckSquare, Star, ArrowRight, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/summit/SessionCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive opacity-80" />
        <h2 className="text-2xl font-semibold">Failed to load dashboard</h2>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }

  const statCards = [
    { label: "Total Sessions", value: summary.totalSessions, icon: Calendar, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Attendees", value: summary.totalAttendees, icon: Users, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
    { label: "Check-ins", value: summary.totalCheckIns, icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Upcoming", value: summary.upcomingCount, icon: Calendar, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Full Sessions", value: summary.fullSessionsCount, icon: Users, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { label: "Avg Rating", value: (summary.averageRating || 0).toFixed(1), icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  ];

  const emergencyNotifications = summary.unreadNotifications?.filter(n => n.level === "emergency") || [];
  const infoNotifications = summary.unreadNotifications?.filter(n => n.level !== "emergency") || [];

  const trackColors: Record<string, string> = {
    lower: "hsl(142 71% 45%)", // green
    middle: "hsl(221 83% 53%)", // blue
    upper: "hsl(262 83% 58%)", // purple
    all: "hsl(215 16% 47%)", // slate
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Overview of your summit activities and stats.</p>
      </div>

      {emergencyNotifications.length > 0 && (
        <div className="space-y-4">
          {emergencyNotifications.map(n => (
            <div key={n.id} className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-4 text-destructive">
              <AlertCircle className="w-6 h-6 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-lg">{n.title}</h3>
                <p className="text-destructive/90">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {infoNotifications.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-4">
          <Info className="w-6 h-6 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100">Recent Updates</h3>
            <div className="space-y-2 mt-2">
              {infoNotifications.slice(0, 2).map(n => (
                <div key={n.id} className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">{n.title}:</span> {n.body}
                </div>
              ))}
            </div>
            {infoNotifications.length > 2 && (
              <Button variant="link" asChild className="p-0 h-auto mt-2 text-blue-600 dark:text-blue-400">
                <Link href="/app/notifications">View all {infoNotifications.length} notifications</Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col items-center text-center space-y-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-0 shadow-sm h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Track Registration</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.trackBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="track" 
                  tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="registeredCount" radius={[4, 4, 0, 0]}>
                  {summary.trackBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={trackColors[entry.track] || trackColors.all} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4 flex flex-col h-[400px]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Up Next</h2>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/app/schedule">
                View full schedule <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {summary.nextSessions && summary.nextSessions.length > 0 ? (
              summary.nextSessions.map((session, i) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                >
                  <SessionCard session={session} showRegisterAction={false} />
                </motion.div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border rounded-xl bg-muted/30">
                <Calendar className="w-10 h-10 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium">No upcoming sessions.</p>
                <p className="text-sm text-muted-foreground mt-1">You have some free time.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}