import { useState } from "react";
import {
  useListTasks,
  useListUsers,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useExportTasks,
  getListTasksQueryKey,
  getExportTasksQueryKey,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Download, Trash2, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const STATUSES = ["todo", "in_progress", "done", "blocked"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
};
const STATUS_TONE: Record<Status, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
  in_progress:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
  blocked:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800",
};

function canManage(role?: string) {
  return role === "faculty" || role === "organizer" || role === "admin";
}

export default function Tasks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { data: tasks, isLoading } = useListTasks();
  const { data: users } = useListUsers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const exportQ = useExportTasks({ query: { enabled: false, queryKey: getExportTasksQueryKey() } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueAt: "",
    status: "todo" as Status,
  });

  const allowed = canManage(me?.role);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.assigneeId) {
      toast({
        title: "Missing fields",
        description: "Title and assignee are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createTask.mutateAsync({
        data: {
          title: form.title,
          description: form.description || undefined,
          assigneeId: form.assigneeId,
          status: form.status,
          dueAt: form.dueAt
            ? new Date(form.dueAt).toISOString()
            : undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task created" });
      setOpen(false);
      setForm({
        title: "",
        description: "",
        assigneeId: "",
        dueAt: "",
        status: "todo",
      });
    } catch (e: any) {
      toast({
        title: "Could not create task",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleStatus = async (id: string, status: Status) => {
    try {
      await updateTask.mutateAsync({ id, data: { status } });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (e: any) {
      toast({
        title: "Could not update task",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task deleted" });
    } catch (e: any) {
      toast({
        title: "Could not delete",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportQ.refetch();
      if (!data) throw new Error("No data");
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.tasks),
        "Tasks",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.sessions),
        "Sessions",
      );
      XLSX.writeFile(wb, "summit-export.xlsx");
      toast({ title: "Export ready", description: "Downloaded summit-export.xlsx" });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-lg">
            Coordinate the work that keeps the summit running.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          {allowed && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> New task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New task</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      placeholder="Confirm AV setup"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Optional details…"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Select
                        value={form.assigneeId}
                        onValueChange={(v) =>
                          setForm({ ...form, assigneeId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pick someone" />
                        </SelectTrigger>
                        <SelectContent>
                          {(users ?? []).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {[u.firstName, u.lastName]
                                .filter(Boolean)
                                .join(" ") || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) =>
                          setForm({ ...form, status: v as Status })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Due</Label>
                    <Input
                      type="datetime-local"
                      value={form.dueAt}
                      onChange={(e) =>
                        setForm({ ...form, dueAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createTask.isPending}>
                    Create task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <ListTodo className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium">No tasks yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Create your first task to start coordinating the summit team.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.4) }}
              className="bg-card border rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{t.title}</div>
                {t.description && (
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {t.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span>
                    Assigned to{" "}
                    <span className="text-foreground">
                      {t.assigneeName ?? t.assigneeEmail ?? "—"}
                    </span>
                  </span>
                  {t.dueAt && (
                    <span>
                      Due {format(new Date(t.dueAt), "MMM d, h:mm a")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={STATUS_TONE[(t.status as Status) ?? "todo"]}
                >
                  {STATUS_LABEL[(t.status as Status) ?? "todo"]}
                </Badge>
                <Select
                  value={t.status}
                  onValueChange={(v) => handleStatus(t.id, v as Status)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowed && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This task will be removed permanently.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(t.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
