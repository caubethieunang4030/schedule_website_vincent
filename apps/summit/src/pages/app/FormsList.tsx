import { Link } from "wouter";
import { useListForms, useGetMe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function canManage(role?: string) {
  return role === "faculty" || role === "organizer" || role === "admin";
}

export default function FormsList() {
  const { data: me } = useGetMe();
  const { data: forms, isLoading } = useListForms();
  const allowed = canManage(me?.role);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Forms</h1>
          <p className="text-muted-foreground text-lg">
            Custom surveys and submissions for the summit.
          </p>
        </div>
        {allowed && (
          <Button asChild>
            <Link href="/app/forms/new">
              <Plus className="w-4 h-4 mr-2" /> New form
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !forms || forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <ClipboardList className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No forms yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Build a custom form to gather feedback, registrations, or
            reflections from attendees.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {forms.map((f, idx) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.04, 0.4) }}
            >
              <Link href={`/app/forms/${f.id}`}>
                <div className="bg-card border rounded-xl p-5 h-full flex flex-col gap-3 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg leading-tight">
                      {f.title}
                    </h3>
                    {f.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {f.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>
                      {f.responseCount} response
                      {f.responseCount === 1 ? "" : "s"}
                    </span>
                    <span>
                      {f.creatorName ?? "—"} ·{" "}
                      {format(new Date(f.createdAt), "MMM d")}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-primary inline-flex items-center group-hover:gap-2 transition-all">
                    Open form
                    <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
