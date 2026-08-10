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
  todo: "Cần làm",
  in_progress: "Đang làm",
  done: "Hoàn thành",
  blocked: "Tạm hoãn",
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
  { id: "all", label: "Tất cả công việc" },
  { id: "daily_group_dump", label: "Bỏ việc cuối ngày (Group Dump)" },
  { id: "personal_prep", label: "Chuẩn bị cá nhân" },
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
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên công việc.",
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
      toast({ title: "Đã tạo công việc mới" });
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
        title: "Không thể tạo công việc",
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
        title: "Lỗi cập nhật",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      toast({ title: "Đã xóa công việc" });
    } catch (e: any) {
      toast({
        title: "Lỗi xóa",
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
        title: "Không thể thêm checklist",
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
        title: "Lỗi cập nhật checklist",
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
        title: "Lỗi xóa mục",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await exportQ.refetch();
      if (!data) throw new Error("Không có dữ liệu");
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
      toast({ title: "Xuất dữ liệu thành công", description: "Đã tải file summit-tasks-export.xlsx" });
    } catch (e: any) {
      toast({
        title: "Lỗi xuất file",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const filteredTasks = (tasks ?? []).filter((t) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "daily_group_dump") return t.category === "daily_group_dump";
    if (filterCategory === "personal_prep") return t.category === "personal_prep" || t.assigneeId === me?.id;
    return true;
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sổ Tay Công Việc & Chuẩn Bị (To-Do List)</h1>
          <p className="text-muted-foreground text-base max-w-2xl">
            Quản lý kế hoạch chuẩn bị Summit, phân chia việc cuối ngày và theo dõi checklist cá nhân của học sinh.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Xuất Excel
          </Button>

          {/* Quick End-of-Day Task Dump button */}
          <Dialog open={openDump} onOpenChange={setOpenDump}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="border">
                <Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Bỏ việc cuối ngày
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" /> Thêm công việc cần làm hôm nay
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Tên công việc / Thiết bị cần chuẩn bị</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="VD: Thu dọn loa đài phòng Auditorium B"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Các mục nhỏ cần làm (Mỗi dòng 1 mục)</Label>
                  <Textarea
                    value={form.initialChecklistText}
                    onChange={(e) => setForm({ ...form, initialChecklistText: e.target.value })}
                    placeholder={"- Đóng gói micro\n- Kiểm tra lại cáp HDMI\n- Bàn giao chìa khóa"}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hạn chót hoàn thành</Label>
                  <Input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenDump(false)}>Hủy</Button>
                <Button onClick={() => handleCreateTask("daily_group_dump")} disabled={createTask.isPending}>
                  Thêm vào danh sách nhóm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* General Task Creator */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Tạo Task mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tạo công việc chuẩn bị mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Tên Task</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Xác nhận danh sách diễn giả"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mô tả chi tiết</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Chi tiết công việc..."
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Người phụ trách</Label>
                    <Select
                      value={form.assigneeId || me?.id || ""}
                      onValueChange={(v) => setForm({ ...form, assigneeId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn học sinh/GV" />
                      </SelectTrigger>
                      <SelectContent>
                        {(users ?? []).map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Loại công việc</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Chung</SelectItem>
                        <SelectItem value="daily_group_dump">Bỏ việc cuối ngày</SelectItem>
                        <SelectItem value="personal_prep">Chuẩn bị cá nhân</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Checklist con ban đầu (Mỗi dòng 1 việc)</Label>
                  <Textarea
                    value={form.initialChecklistText}
                    onChange={(e) => setForm({ ...form, initialChecklistText: e.target.value })}
                    placeholder={"In danh bạ\nKiểm tra lại danh sách đăng ký"}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hạn hoàn thành</Label>
                  <Input
                    type="datetime-local"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
                <Button onClick={() => handleCreateTask(form.category)} disabled={createTask.isPending}>
                  Tạo Task
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
          <h3 className="text-xl font-medium">Chưa có công việc nào</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Nhấn nút "Bỏ việc cuối ngày" hoặc "Tạo Task mới" để thêm danh mục chuẩn bị cho đợt Summit tới.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((t, idx) => {
            const checklistItems = t.checklists ?? [];
            const completedCount = checklistItems.filter((c) => c.isCompleted).length;
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
                          <Sparkles className="w-3 h-3 mr-1" /> Cuối ngày
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
                        <UserCheck className="w-3.5 h-3.5" /> Phụ trách:{" "}
                        <strong className="text-foreground">{t.assigneeName ?? t.assigneeEmail ?? "Chưa phân công"}</strong>
                      </span>
                      {t.dueAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Hạn: {format(new Date(t.dueAt), "dd/MM/yyyy HH:mm")}
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
                            <AlertDialogTitle>Xóa công việc này?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Thao tác này sẽ xóa vĩnh viễn công việc và toàn bộ checklist đi kèm.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(t.id)}>
                              Xóa
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
                        <CheckSquare className="w-3.5 h-3.5" /> Tiến độ Checklist: {completedCount}/{checklistItems.length} mục
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}

                {/* Sub-Checklist Items */}
                <div className="bg-muted/30 rounded-xl p-3.5 space-y-2.5">
                  <div className="space-y-2">
                    {checklistItems.map((item) => (
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
                      placeholder="Thêm mục nhỏ cần làm (+ nhấn Enter)..."
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
                      Thêm
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

