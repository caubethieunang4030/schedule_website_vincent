import { useState } from "react";
import {
  useListInvitedStudents,
  useImportInvitedStudents,
  useDeleteInvitedStudent,
  getListInvitedStudentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Upload, Trash2, Download, CheckCircle2, Clock } from "lucide-react";

const TRACKS = ["lower", "middle", "upper", "all", "required_all", "teachers"];

function normalizeRow(r: Record<string, unknown>) {
  const lc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) lc[k.toLowerCase().trim()] = v;
  const email = String(
    lc["email"] ?? lc["email address"] ?? lc["e-mail"] ?? "",
  ).trim();
  const firstName = String(lc["firstname"] ?? lc["first name"] ?? lc["first"] ?? "").trim() || null;
  const lastName = String(lc["lastname"] ?? lc["last name"] ?? lc["last"] ?? "").trim() || null;
  let division = String(lc["division"] ?? lc["track"] ?? "all").toLowerCase().trim();
  if (!TRACKS.includes(division)) division = "all";
  return { email, firstName, lastName, division };
}

export default function AdminStudents() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: students, isLoading } = useListInvitedStudents();
  const importMutation = useImportInvitedStudents();
  const deleteMutation = useDeleteInvitedStudent();
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const rows = raw.map(normalizeRow).filter((r) => r.email).map((r) => ({
        ...r,
        division: r.division as "lower" | "middle" | "upper" | "all" | "required_all" | "teachers",
      }));
      if (rows.length === 0) {
        toast({
          title: "No valid rows",
          description: "Make sure the file has an 'email' column.",
          variant: "destructive",
        });
        return;
      }
      const result = await importMutation.mutateAsync({ data: { rows } });
      qc.invalidateQueries({ queryKey: getListInvitedStudentsQueryKey() });
      toast({
        title: "Roster imported",
        description: `${result.inserted} added · ${result.skipped} skipped (duplicates or invalid).`,
      });
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message ?? "",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListInvitedStudentsQueryKey() });
      toast({ title: "Removed" });
    } catch (e: any) {
      toast({
        title: "Could not remove",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    if (!students) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        students.map((s) => ({
          email: s.email,
          firstName: s.firstName ?? "",
          lastName: s.lastName ?? "",
          division: s.division,
          registered: s.registered ? "yes" : "no",
          registeredAt: s.registeredAt ?? "",
          invitedAt: s.invitedAt,
        })),
      ),
      "Students",
    );
    XLSX.writeFile(wb, "students.xlsx");
  };

  const filtered = (students ?? []).filter((s) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      s.email.toLowerCase().includes(q) ||
      (s.firstName ?? "").toLowerCase().includes(q) ||
      (s.lastName ?? "").toLowerCase().includes(q) ||
      s.division.toLowerCase().includes(q)
    );
  });

  const total = students?.length ?? 0;
  const registered = (students ?? []).filter((s) => s.registered).length;

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Students</h1>
        <p className="text-muted-foreground text-lg">
          Import a roster (CSV or Excel) and track who has signed up.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Invited</div>
          <div className="text-3xl font-semibold mt-1">{total}</div>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Registered</div>
          <div className="text-3xl font-semibold mt-1 text-emerald-600 dark:text-emerald-400">
            {registered}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-5">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-3xl font-semibold mt-1 text-amber-600 dark:text-amber-400">
            {total - registered}
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-3">
        <div className="font-medium">Import roster</div>
        <p className="text-sm text-muted-foreground">
          Upload a <span className="font-medium">.csv</span>,{" "}
          <span className="font-medium">.xlsx</span>, or{" "}
          <span className="font-medium">.xls</span> file. Required column:{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">email</code>.
          Optional columns:{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">firstName</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">lastName</code>,{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">division</code>{" "}
          (lower / middle / upper / all / required_all / teachers).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium cursor-pointer transition-colors ${
              busy
                ? "bg-primary/60 text-primary-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Upload className="w-4 h-4" />
            {busy ? "Importing…" : "Choose file"}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) handleFile(f);
              }}
            />
          </label>
          <Button variant="outline" onClick={handleExport} disabled={!students}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <span className="text-xs text-muted-foreground">
            CSV or Excel · max ~5,000 rows
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="Filter by email, name, or division…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="bg-card border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {total === 0
                ? "No students invited yet — import a roster above."
                : "No students match that filter."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      {s.email}
                    </TableCell>
                    <TableCell>
                      {[s.firstName, s.lastName].filter(Boolean).join(" ") ||
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {s.division.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.registered ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm font-medium">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove student?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes them from the invited roster. If they
                              already created an account, that account is not
                              affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(s.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
