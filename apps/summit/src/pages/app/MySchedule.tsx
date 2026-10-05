import { useGetMyRegistrations } from "@workspace/api-client-react";
import { SessionCard } from "@/components/summit/SessionCard";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function MySchedule() {
  const { data: registrations, isLoading } = useGetMyRegistrations();

  const groupedSessions = useMemo(() => {
    if (!Array.isArray(registrations)) return [];
    
    const sessions = registrations as any[];
    const groups: Record<string, typeof sessions> = {};
    
    sessions.forEach(session => {
      const s = session?.session || session;
      if (!s?.startsAt) return;
      try {
        const dateKey = format(parseISO(s.startsAt), "yyyy-MM-dd");
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(s);
      } catch {}
    });

    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => {
        let formattedDate = date;
        try {
          if (items[0]?.startsAt) {
            formattedDate = format(parseISO(items[0].startsAt), "EEEE, MMM d");
          }
        } catch {}
        return {
          date,
          formattedDate,
          items: items.sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""))
        };
      });
  }, [registrations]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">My Schedule</h1>
          <p className="text-muted-foreground text-lg">Your personalized agenda for the summit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {registrations && (registrations as any[]).length > 0 && (
            <Button variant="outline" onClick={() => window.open("/api/sessions/export/calendar", "_blank")}>
              <Calendar className="w-4 h-4 mr-2" />
              Sync to Calendar
            </Button>
          )}
          <Button asChild>
            <Link href="/app/schedule">
              <Plus className="w-4 h-4 mr-2" />
              Add Sessions
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2].map((j) => (
                  <Skeleton key={j} className="h-[280px] rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : groupedSessions.length > 0 ? (
        <div className="space-y-12">
          {groupedSessions.map((group, groupIdx) => (
            <div key={group.date} className="space-y-6">
              <h2 className="text-2xl font-semibold tracking-tight border-b pb-2 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
                {group.formattedDate}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {group.items.map((session, itemIdx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min((groupIdx * 2 + itemIdx) * 0.05, 0.5) }}
                  >
                    <SessionCard session={session} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <Calendar className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">Your schedule is empty</h3>
          <p className="text-muted-foreground mt-2 max-w-md mb-6">
            You haven't registered for any sessions yet. Browse the schedule to find sessions you're interested in.
          </p>
          <Button asChild size="lg">
            <Link href="/app/schedule">Browse Schedule</Link>
          </Button>
        </div>
      )}
    </div>
  );
}