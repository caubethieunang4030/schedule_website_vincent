import { useState, useMemo } from "react";
import { useListSessions } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionCard } from "@/components/summit/SessionCard";
import { format, parseISO } from "date-fns";
import { Track } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarOff } from "lucide-react";

export default function Schedule() {
  const [track, setTrack] = useState<Track | "all">("all");
  
  const { data: sessions, isLoading } = useListSessions(
    track !== "all" ? { track } : undefined
  );

  const groupedSessions = useMemo(() => {
    if (!sessions) return [];
    
    const groups: Record<string, typeof sessions> = {};
    
    sessions.forEach(session => {
      const dateKey = format(parseISO(session.startsAt), "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(session);
    });

    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        formattedDate: format(parseISO(items[0].startsAt), "EEEE, MMM d"),
        items: items.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      }));
  }, [sessions]);

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground text-lg">Browse and register for summit sessions.</p>
      </div>

      <Tabs value={track} onValueChange={(val) => setTrack(val as Track | "all")} className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1 w-full sm:w-auto overflow-x-auto justify-start flex-wrap">
          <TabsTrigger value="all" className="px-4 rounded-md">All Tracks</TabsTrigger>
          <TabsTrigger value="lower" className="px-4 rounded-md">Lower</TabsTrigger>
          <TabsTrigger value="middle" className="px-4 rounded-md">Middle</TabsTrigger>
          <TabsTrigger value="upper" className="px-4 rounded-md">Upper</TabsTrigger>
          <TabsTrigger value="required_all" className="px-4 rounded-md">Required All</TabsTrigger>
          <TabsTrigger value="teachers" className="px-4 rounded-md">Teachers</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3].map((j) => (
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
          <CalendarOff className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No sessions found</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            We couldn't find any sessions matching your selected track. Try clearing your filters.
          </p>
        </div>
      )}
    </div>
  );
}