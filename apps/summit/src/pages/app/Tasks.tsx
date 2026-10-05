import { useState } from "react";
import {
  useListTasks,
  useListUsers,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCreateTaskChecklist,
  useUpdateTaskChecklist,
  useDeleteTaskChecklist,
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
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download, Trash2, ListTodo, CheckSquare, Clock, Calendar, Sparkles, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const STATUSES = ["todo", "in_progress", "done", "blocked"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABEL: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Completed",
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

const CATEGORIES = [
  { id: "all", label: "All Tasks" },
  { id: "daily_group_dump", label: "Daily Group Dump" },
  { id: "personal_prep", label: "Personal Prep" },
] as const;

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

  const createChecklist = useCreateTaskChecklist();
  const updateChecklist = useUpdateTaskChecklist();
  const deleteChecklist = useDeleteTaskChecklist();

  const exportQ = useExportTasks({ query: { enabled: false, queryKey: getExportTasksQueryKey() } });

  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [openDump, setOpenDump] = useState(false);

  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueAt: "",
    status: "todo" as Status,
    category: "general",
    priority: "medium",
    initialChecklistText: "",
  });

  const allowed = canManage(me?.role);

  const handleCreateTask = async (categoryType = "general") => {
    if (!form.title.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return;
    }

    const initialChecklist = form.initialChecklistText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await createTask.mutateAsync({
        data: {
          title: form.title,
          description: form.description || undefined,
          assigneeId: form.assigneeId || me?.id || "",
          status: form.status,
          category: categoryType,
          priority: form.priority,
          seasonYear: "2025-2026",
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
          initialChecklist: initialChecklist.length ? initialChecklist : undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "New task created successfully" });
      setOpen(false);
      setOpenDump(false);
      setForm({
        title: "",
        description: "",
        assigneeId: "",
        dueAt: "",
        status: "todo",
        category: "general",
        priority: "medium",
        initialChecklistText: "",
      });
    } catch (e: any) {
      toast({
        title: "Could not create task",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, status: Status) => {
    try {
      await updateTask.mutateAsync({ id, data: { status } });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (e: any) {
      toast({
        title: "Update Error",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Task deleted successfully" });
    } catch (e: any) {
      toast({
        title: "Delete Error",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleAddChecklist = async (taskId: string) => {
    const text = newChecklistText[taskId]?.trim();
    if (!text) return;
    try {
      await createChecklist.mutateAsync({
        id: taskId,
        data: { title: text },
      });
      setNewChecklistText((prev) => ({ ...prev, [taskId]: "" }));
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (e: any) {
      toast({
        title: "Could not add checklist item",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleToggleChecklist = async (taskId: string, checklistId: string, currentVal: boolean) => {
    try {
      await updateChecklist.mutateAsync({
        id: taskId,
        checklistId,
        data: { isCompleted: !currentVal },
      });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (e: any) {
      toast({
        title: "Checklist update error",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChecklist = async (taskId: string, checklistId: string) => {
    try {
      await deleteChecklist.mutateAsync({ id: taskId, checklistId });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    } catch (e: any) {
      toast({
        title: "Item deletion error",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportQ.refetch();
      if (!data) throw new Error("No data available to export");
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.tasks),
        "Tasks"
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data.sessions),
        "Sessions"
      );
      XLSX.writeFile(wb, "summit-tasks-export.xlsx");
      toast({ title: "Export successful", description: "Downloaded summit-tasks-export.xlsx" });
    } catch (e: any) {
      toast({
        title: "Export error",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const userList = Array.isArray(users)
    ? users
    : Array.isArray((users as any)?.users)
      ? (users as any).users
      : Array.isArray((users as any)?.data)
        ? (users as any).data
        : [];

  const taskList = Array.isArray(tasks)
    ? tasks
    : Array.isArray((tasks as any)?.tasks)
      ? (tasks as any).tasks
      : Array.isArray((tasks as any)?.data)
        ? (tasks as any).data
        : [];

  const filteredTasks = taskList.filter((t: any) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "daily_group_dump") return t.category === "daily_group_dump";
    if (filterCategory === "personal_prep") return t.category === "personal_prep" || t.assigneeId === me?.id;
    return true;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Tasks & Summit Preparation</h1>
          <p className="text-muted-foreground text-base max-w-2xl">
            Manage summit preparation tasks, assign daily group dumps, and track student checklists.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>

          {/* Quick End-of-Day Task Dump button */}
          <Dialog open={openDump} onOpenChange={setOpenDump}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="border">
                <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Daily Group Dump
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Add Today's Tasks
                </DialogTitle>
                <DialogDescription>
                  Enter preparation tasks and sub-items for group assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Task Title / Equipment Needed</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Gather audio speakers from Auditorium B"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sub-items (One per line)</Label>
                  <Textarea
                    value={form.initialChecklistText}
                    onChange={(e) => setForm({ ...form, initialChecklistText: e.target.value })}
                    placeholder={"- Pack microphones\n- Check HDMI cables\n- Return room keys"}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenDump(false)}>Cancel</Button>
                <Button onClick={() => handleCreateTask("daily_group_dump")} disabled={createTask.isPending}>
                  Add to Group Tasks
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* General Task Creator */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Preparation Task</DialogTitle>
                <DialogDescription>
                  Fill out task details, assignees, and optional checklist items.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Confirm presenter list"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Detailed Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Task details..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={form.assigneeId || me?.id || ""}
                      onValueChange={(v) => setForm({ ...form, assigneeId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student/faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {userList.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Task Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="daily_group_dump">Daily Group Dump</SelectItem>
                        <SelectItem value="personal_prep">Personal Prep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Initial Sub-items (One per line)</Label>
                  <Textarea
                    value={form.initialChecklistText}
                    onChange={(e) => setForm({ ...form, initialChecklistText: e.target.value })}
                    placeholder={"Print attendee roster\nVerify registration list"}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => handleCreateTask(form.category)} disabled={createTask.isPending}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterCategory} onValueChange={setFilterCategory}>
        <TabsList className="w-full sm:w-auto grid grid-cols-3">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id} className="px-4">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Task List Rendering */}
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !filteredTasks || filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-muted/10">
          <ListTodo className="w-16 h-16 text-muted-foreground mb-4 opacity-40" />
          <h3 className="text-xl font-medium">No tasks found</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Click "Daily Group Dump" or "New Task" to add preparation items for the upcoming summit.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((t: any, idx: number) => {
            const checklistItems = t.checklists ?? [];
            const completedCount = checklistItems.filter((c: any) => c.isCompleted).length;
            const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 hover:border-primary/30 transition-all"
              >
                {/* Task Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{t.title}</h3>
                      {t.category === "daily_group_dump" && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200">
                          <Sparkles className="w-3 h-3 mr-1" /> Daily Dump
                        </Badge>
                      )}
                      <Badge variant="outline" className={STATUS_TONE[(t.status as Status) ?? "todo"]}>
                        {STATUS_LABEL[(t.status as Status) ?? "todo"]}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" /> Assignee:{" "}
                        <strong className="text-foreground">{t.assigneeName ?? t.assigneeEmail ?? "Unassigned"}</strong>
                      </span>
                      {t.dueAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Due: {format(new Date(t.dueAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={t.status}
                      onValueChange={(v) => handleStatusChange(t.id, v as Status)}
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
                    {(allowed || t.assigneeId === me?.id || t.createdBy === me?.id) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action will permanently delete this task and all attached sub-checklists.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(t.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* Checklist Progress Bar */}
                {checklistItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <CheckSquare className="w-3.5 h-3.5" /> Checklist Progress: {completedCount}/{checklistItems.length} items
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}

                {/* Sub-Checklist Items */}
                <div className="bg-muted/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="space-y-2">
                    {checklistItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 group text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={() => handleToggleChecklist(t.id, item.id, item.isCompleted)}
                            id={`chk-${item.id}`}
                          />
                          <label
                            htmlFor={`chk-${item.id}`}
                            className={`cursor-pointer truncate ${item.isCompleted ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
                          >
                            {item.title}
                          </label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteChecklist(t.id, item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Add Sub-Checklist Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder="Add sub-item (+ press Enter)..."
                      className="h-8 text-sm bg-background"
                      value={newChecklistText[t.id] ?? ""}
                      onChange={(e) => setNewChecklistText({ ...newChecklistText, [t.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddChecklist(t.id);
                        }
                      }}
                    />
                    <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => handleAddChecklist(t.id)}>
                      Add
                    </Button>
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

