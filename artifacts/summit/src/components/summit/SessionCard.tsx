import { Link } from "wouter";
import { format } from "date-fns";
import { Users, Clock, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Session } from "@workspace/api-client-react";
import { useRegisterForSession, useUnregisterFromSession, getListSessionsQueryKey, getGetMyRegistrationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SessionCardProps {
  session: Session;
  showRegisterAction?: boolean;
}

export function SessionCard({ session, showRegisterAction = true }: SessionCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const register = useRegisterForSession();
  const unregister = useUnregisterFromSession();

  const isFull = session.registeredCount >= session.capacity;
  const progress = (session.registeredCount / session.capacity) * 100;

  const trackColors: Record<string, string> = {
    lower: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    middle: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    upper: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    all: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    required_all: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    teachers: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  };
  const trackLabel: Record<string, string> = {
    lower: "Lower",
    middle: "Middle",
    upper: "Upper",
    all: "All",
    required_all: "Required All",
    teachers: "Teachers",
  };

  const handleRegister = async () => {
    try {
      await register.mutateAsync({ id: session.id });
      toast({ title: "Registered for session successfully" });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to register", description: e.message || "An error occurred", variant: "destructive" });
    }
  };

  const handleUnregister = async () => {
    try {
      await unregister.mutateAsync({ id: session.id });
      toast({ title: "Unregistered from session successfully" });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetMyRegistrationsQueryKey() });
    } catch (e: any) {
      toast({ title: "Failed to unregister", description: e.message || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className={trackColors[session.track] ?? trackColors.all}>
                {trackLabel[session.track] ?? session.track} Track
              </Badge>
              {session.mandatory && (
                <Badge variant="default" className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20">
                  Mandatory
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg leading-tight line-clamp-2">
              <Link href={`/app/sessions/${session.id}`} className="hover:text-primary transition-colors">
                {session.title}
              </Link>
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {format(new Date(session.startsAt), "h:mm a")} - {format(new Date(session.endsAt), "h:mm a")}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {session.room}
              </div>
            </div>
          </div>
        </div>

        {session.speakers && session.speakers.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">Speakers: </span>
            <span className="font-medium text-foreground">
              {session.speakers.map((s: { name: string }) => s.name).join(", ")}
            </span>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{session.registeredCount} / {session.capacity} registered</span>
            </div>
            {isFull && !session.isRegistered && (
              <Badge variant="secondary" className="text-xs">Full</Badge>
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-4 mt-auto">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/app/sessions/${session.id}`}>Details</Link>
        </Button>
        {showRegisterAction && (
          session.isRegistered ? (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleUnregister}
              disabled={unregister.isPending}
              className="flex-1 group"
            >
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              <span className="group-hover:hidden">Registered</span>
              <span className="hidden group-hover:inline">Unregister</span>
            </Button>
          ) : (
            <Button 
              size="sm" 
              onClick={handleRegister} 
              disabled={isFull || register.isPending}
              className="flex-1"
            >
              Register
            </Button>
          )
        )}
      </div>
    </div>
  );
}