import { useState } from "react";
import {
  useListSessions,
  useCreateSession,
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
import { CalendarDays, Trash2, Edit2, Plus, Users, Clock, MapPin, Eye } from "lucide-react";
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
  const updateMutation = useUpdateSession();
  const deleteMutation = useDeleteSession();

  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);

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
          <h1 className="text-3xl font-semibold tracking-tight">Sessions CMS</h1>
          <p className="text-muted-foreground text-lg">
            Manage the summit schedule - create, edit, or delete sessions.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="h-10 px-4">
          <Plus className="w-4 h-4 mr-2" /> Add Session
        </Button>
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
