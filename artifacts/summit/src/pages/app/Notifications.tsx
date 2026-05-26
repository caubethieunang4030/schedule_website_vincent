import { useState } from "react";
import {
  useListNotifications,
  useCreateNotification,
  getListNotificationsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, AlertTriangle, AlertOctagon, Info, Plus } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

type Level = "info" | "warning" | "emergency";

const LEVEL_TONE: Record<Level, string> = {
  info: "border bg-card",
  warning:
    "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20",
  emergency:
    "border-destructive bg-destructive/10 dark:border-destructive dark:bg-destructive/20",
};

const LEVEL_ICON: Record<Level, React.ComponentType<{ className?: string }>> = {
  info: Info,
  warning: AlertTriangle,
  emergency: AlertOctagon,
};

function canManage(role?: string) {
  return role === "faculty" || role === "organizer" || role === "admin";
}

export default function Notifications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { data: items, isLoading } = useListNotifications();
  const create = useCreateNotification();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    level: "info" as Level,
  });
  const allowed = canManage(me?.role);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and body are required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ data: form });
      qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      toast({ title: "Notification posted" });
      setOpen(false);
      setForm({ title: "", body: "", level: "info" });
    } catch (e: any) {
      toast({
        title: "Could not post",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Notifications
          </h1>
          <p className="text-muted-foreground text-lg">
            Summit-wide announcements. Updated in real time.
          </p>
        </div>
        {allowed && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Post notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) =>
                      setForm({ ...form, level: v as Level })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    rows={5}
                    value={form.body}
                    onChange={(e) =>
                      setForm({ ...form, body: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={create.isPending}>
                  Post
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <Bell className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No notifications yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Summit announcements will appear here as they are posted.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n, idx) => {
            const Icon = LEVEL_ICON[(n.level as Level) ?? "info"];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                className={`rounded-xl p-5 ${
                  LEVEL_TONE[(n.level as Level) ?? "info"]
                }`}
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{n.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(n.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {n.body}
                    </p>
                    {n.creatorName && (
                      <div className="text-xs text-muted-foreground pt-1">
                        Posted by {n.creatorName}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
