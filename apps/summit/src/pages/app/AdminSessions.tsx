import { useState } from "react";
import {
  useListSessions,
  useCreateSession,
  useCreateBulkSessions,
  useUpdateSession,
  useDeleteSession,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Trash2, Edit2, Plus, Users, Clock, MapPin, Eye, FileSpreadsheet, Upload, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";

const TRACKS = [
  { value: "all", label: "All Tracks" },
  { value: "lower", label: "Lower" },
  { value: "middle", label: "Middle" },
  { value: "upper", label: "Upper" },
  { value: "required_all", label: "Required All" },
  { value: "teachers", label: "Teachers" },
];

const TIME_PRESETS = [
  { label: "Ca 1 (Sáng A: 08:30 - 09:30)", start: "08:30", end: "09:30" },
  { label: "Ca 2 (Sáng B: 09:45 - 10:45)", start: "09:45", end: "10:45" },
  { label: "Ca 3 (Chiều C: 13:15 - 14:15)", start: "13:15", end: "14:15" },
  { label: "Ca 4 (Chiều D: 14:30 - 15:30)", start: "14:30", end: "15:30" },
];

const trackColors: Record<string, string> = {
  lower: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  middle: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  upper: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  all: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  required_all: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  teachers: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
};

export default function AdminSessions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sessions, isLoading } = useListSessions();
  const createMutation = useCreateSession();
  const createBulkMutation = useCreateBulkSessions();
  const updateMutation = useUpdateSession();
  const deleteMutation = useDeleteSession();

  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [room, setRoom] = useState("");
  const [track, setTrack] = useState<string>("all");
  const [mandatory, setMandatory] = useState(false);
  const [capacity, setCapacity] = useState(30);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const handleOpenCreate = () => {
    setEditingSession(null);
    setTitle("");
    setDescription("");
    setLocationVal("");
    setRoom("");
    setTrack("all");
    setMandatory(false);
    setCapacity(30);
    setStartsAt("");
    setEndsAt("");
    setOpen(true);
  };

  const handleApplyPreset = (idxStr: string) => {
    const idx = Number(idxStr);
    const p = TIME_PRESETS[idx];
    if (!p) return;
    const baseDate = startsAt ? startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setStartsAt(`${baseDate}T${p.start}`);
    setEndsAt(`${baseDate}T${p.end}`);
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const sampleData = [
        {
          "Tên ca học": "Hội thảo Trí tuệ Nhân tạo trong Y học",
          "Mô tả": "Giới thiệu các ứng dụng AI trong chẩn đoán hình ảnh",
          "Địa điểm": "Tòa nhà Khoa học",
          "Phòng học": "Auditorium A",
          "Khối (lower/middle/upper/all/teachers)": "upper",
          "Bắt buộc (true/false)": "false",
          "Sức chứa": 50,
          "Bắt đầu (YYYY-MM-DD HH:mm)": "2026-09-15 08:30",
          "Kết thúc (YYYY-MM-DD HH:mm)": "2026-09-15 09:30",
          "Diễn giả": "TS. Nguyễn Văn A",
        },
        {
          "Tên ca học": "Xưởng Lập trình Robotics VEX",
          "Mô tả": "Thực hành thiết kế robot tự hành",
          "Địa điểm": "Maker Space",
          "Phòng học": "Lab 102",
          "Khối (lower/middle/upper/all/teachers)": "middle",
          "Bắt buộc (true/false)": "false",
          "Sức chứa": 25,
          "Bắt đầu (YYYY-MM-DD HH:mm)": "2026-09-15 09:45",
          "Kết thúc (YYYY-MM-DD HH:mm)": "2026-09-15 10:45",
          "Diễn giả": "ThS. Trần Thị B",
        },
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, "CauHocMau");
      XLSX.writeFile(wb, "mau-nhap-ca-hoc-summit.xlsx");
      toast({ title: "Đã tải file Excel mẫu (.xlsx)" });
    } catch (e: any) {
      toast({ title: "Lỗi tải file mẫu", description: e.message, variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(ws);

      const parsed = json.map((row) => {
        const titleStr = row["Tên ca học"] || row["Title"] || row["title"] || "";
        const startStr = row["Bắt đầu (YYYY-MM-DD HH:mm)"] || row["StartsAt"] || row["startsAt"];
        const endStr = row["Kết thúc (YYYY-MM-DD HH:mm)"] || row["EndsAt"] || row["endsAt"];
        const speakerStr = row["Diễn giả"] || row["Speaker"] || "";

        return {
          title: titleStr,
          description: row["Mô tả"] || row["Description"] || "",
          location: row["Địa điểm"] || row["Location"] || "",
          room: row["Phòng học"] || row["Room"] || "",
          track: row["Khối (lower/middle/upper/all/teachers)"] || row["Track"] || "all",
          mandatory: String(row["Bắt buộc (true/false)"] || row["Mandatory"]).toLowerCase() === "true",
          capacity: Number(row["Sức chứa"] || row["Capacity"]) || 30,
          startsAt: new Date(startStr).toISOString(),
          endsAt: new Date(endStr).toISOString(),
          speakers: speakerStr ? [{ name: speakerStr }] : [],
        };
      }).filter((r) => r.title && r.startsAt && r.endsAt);

      setParsedImportRows(parsed);
      toast({ title: `Đã đọc ${parsed.length} ca học từ file Excel` });
    } catch (err: any) {
      toast({ title: "Lỗi đọc file Excel", description: err.message, variant: "destructive" });
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!parsedImportRows.length) return;
    try {
      await createBulkMutation.mutateAsync({ data: parsedImportRows });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      toast({ title: `Đã nhập thành công ${parsedImportRows.length} ca học mới!` });
      setOpenImport(false);
      setParsedImportRows([]);
    } catch (e: any) {
      toast({ title: "Lỗi nhập hàng loạt", description: e.message, variant: "destructive" });
    }
  };

  const handleOpenEdit = (session: any) => {
    setEditingSession(session);
    setTitle(session.title);
    setDescription(session.description || "");
    setLocationVal(session.location || "");
    setRoom(session.room || "");
    setTrack(session.track || "all");
    setMandatory(!!session.mandatory);
    setCapacity(session.capacity ?? 30);

    const toInputString = (iso: string) => {
      if (!iso) return "";
      const date = new Date(iso);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - offset * 60000);
      return localDate.toISOString().slice(0, 16);
    };

    setStartsAt(toInputString(session.startsAt));
    setEndsAt(toInputString(session.endsAt));
    setOpen(true);
  };

  const toISOString = (input: string) => {
    if (!input) return "";
    return new Date(input).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !startsAt || !endsAt) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields (Title, Starts At, Ends At).",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startsAt) >= new Date(endsAt)) {
      toast({
        title: "Invalid dates",
        description: "End time must be after the start time.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      title,
      description,
      location: locationVal,
      room,
      track: track as any,
      mandatory,
      capacity: Number(capacity),
      startsAt: toISOString(startsAt),
      endsAt: toISOString(endsAt),
    };

    try {
      if (editingSession) {
        await updateMutation.mutateAsync({
          id: editingSession.id,
          data: payload,
        });
        toast({ title: "Session updated successfully" });
      } else {
        await createMutation.mutateAsync({
          data: payload,
        });
        toast({ title: "Session created successfully" });
      }
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      setOpen(false);
    } catch (err: any) {
      toast({
        title: "Error saving session",
        description: err?.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      toast({ title: "Session deleted successfully" });
    } catch (err: any) {
      toast({
        title: "Error deleting session",
        description: err?.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const filtered = (sessions ?? []).filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q) ||
      (s.room ?? "").toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q) ||
      s.track.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Quản Lý Ca Học (Sessions CMS)</h1>
          <p className="text-muted-foreground text-lg">
            Quản lý khung giờ, phòng học và danh sách hội thảo ngày Summit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" /> Tải mẫu Excel
          </Button>
          <Button variant="secondary" className="border" onClick={() => setOpenImport(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Nhập từ Excel
          </Button>
          <Button onClick={handleOpenCreate} className="h-10 px-4">
            <Plus className="w-4 h-4 mr-2" /> Thêm Ca Học
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Sessions</div>
            <div className="text-2xl font-semibold mt-1">{sessions?.length ?? 0}</div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-lg text-red-600">
            <ShieldAlertIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Mandatory</div>
            <div className="text-2xl font-semibold mt-1">
              {sessions?.filter((s) => s.mandatory).length ?? 0}
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 rounded-lg text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Highest Capacity</div>
            <div className="text-2xl font-semibold mt-1">
              {sessions?.length ? Math.max(...sessions.map((s) => s.capacity)) : 0}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Filter by title, room, track or location..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {sessions?.length === 0
                ? "No sessions created yet. Click 'Add Session' to get started."
                : "No sessions match that filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Time & Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold line-clamp-1">{s.title}</span>
                          {s.mandatory && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.2">
                              Mandatory
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">
                          {s.description || "No description"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${trackColors[s.track] ?? trackColors.all}`}>
                        {s.track.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{format(parseISO(s.startsAt), "MMM dd, yyyy")}</span>
                        <span className="text-muted-foreground">
                          {format(parseISO(s.startsAt), "h:mm a")} - {format(parseISO(s.endsAt), "h:mm a")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.location || "—"}</TableCell>
                    <TableCell className="text-sm font-mono">{s.room || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{s.registeredCount ?? 0} / {s.capacity}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/app/sessions/${s.id}`}>
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete session?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{s.title}</strong> and remove all student registrations. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(s.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editingSession ? "Edit Session" : "Create Session"}</DialogTitle>
              <DialogDescription>
                Fill in the details to {editingSession ? "update the" : "create a new"} summit session.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Robotics Build Lab"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide a brief summary of what the session covers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-sm font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Maker Space"
                  value={locationVal}
                  onChange={(e) => setLocationVal(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room" className="text-sm font-medium">Room</Label>
                <Input
                  id="room"
                  placeholder="e.g. M-110"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="track" className="text-sm font-medium">Track *</Label>
                <Select value={track} onValueChange={setTrack}>
                  <SelectTrigger id="track">
                    <SelectValue placeholder="Select track" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRACKS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacity" className="text-sm font-medium">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="startsAt" className="text-sm font-medium">Starts At *</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endsAt" className="text-sm font-medium">Ends At *</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  required
                />
              </div>

              <div className="col-span-2 flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label htmlFor="mandatory" className="text-sm font-medium cursor-pointer">
                    Mandatory Session
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Required for all students registered under this track.
                  </p>
                </div>
                <Switch
                  id="mandatory"
                  checked={mandatory}
                  onCheckedChange={setMandatory}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSession ? "Save Changes" : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple fallback icon
function ShieldAlertIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
