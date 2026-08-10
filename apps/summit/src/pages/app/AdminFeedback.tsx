import { Link } from "wouter";
import { useGetFeedbackAggregate } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquareOff, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const trackTone: Record<string, string> = {
  lower:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  middle:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  upper:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  all: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  required_all:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  teachers:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
};

function trackLabel(t: string) {
  return (
    { lower: "Lower", middle: "Middle", upper: "Upper", all: "All", required_all: "Required All", teachers: "Teachers" }[t] ?? t
  );
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${
            n <= full
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminFeedback() {
  const { data, isLoading } = useGetFeedbackAggregate();

  const handleExport = async () => {
    if (!data) return;
    const XLSX = await import("xlsx");
    
    // Flat rows for session feedback aggregates
    const rows = data.map((s) => ({
      "Session ID": s.sessionId,
      "Session Title": s.sessionTitle,
      "Track": trackLabel(s.track),
      "Start Time": format(new Date(s.startsAt), "yyyy-MM-dd HH:mm"),
      "Average Rating": Number((s.averageRating || 0).toFixed(2)),
      "Response Count": s.count,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Feedback Aggregate");

    // Flat rows for recent comments
    const commentRows: any[] = [];
    data.forEach((s) => {
      s.recentComments.forEach((c) => {
        commentRows.push({
          "Session Title": s.sessionTitle,
          "Track": trackLabel(s.track),
          "User": c.userName ?? "Anonymous",
          "Rating": c.rating,
          "Comment": c.comment,
          "Created At": format(new Date(c.createdAt), "yyyy-MM-dd HH:mm"),
        });
      });
    });

    if (commentRows.length > 0) {
      const commentsWorksheet = XLSX.utils.json_to_sheet(commentRows);
      XLSX.utils.book_append_sheet(workbook, commentsWorksheet, "Recent Comments");
    }

    XLSX.writeFile(workbook, `Feedback_Report_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Feedback overview
          </h1>
          <p className="text-muted-foreground text-lg">
            Average ratings, response counts, and recent comments per session.
          </p>
        </div>
        {data && data.length > 0 && (
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <MessageSquareOff className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No feedback yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Once attendees rate their sessions, you'll see aggregated insights
            here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((s) => (
            <div
              key={s.sessionId}
              className="bg-card border rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={trackTone[s.track] ?? trackTone.all}
                    >
                      {trackLabel(s.track)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(s.startsAt), "EEE MMM d · h:mm a")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">
                    <Link
                      href={`/app/sessions/${s.sessionId}`}
                      className="hover:text-primary transition-colors"
                    >
                      {s.sessionTitle}
                    </Link>
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-semibold">
                        {(s.averageRating || 0).toFixed(1)}
                      </span>
                      <Stars value={s.averageRating} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.count} response{s.count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              </div>

              {s.recentComments.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  {s.recentComments.map((c, i) => (
                    <div
                      key={i}
                      className="text-sm bg-muted/40 rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {c.userName ?? "Anonymous"}
                        </span>
                        <Stars value={c.rating} />
                      </div>
                      <p className="whitespace-pre-line">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
