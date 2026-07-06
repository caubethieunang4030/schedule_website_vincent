import { useMemo, useState } from "react";
import { useParams } from "wouter";
import {
  useGetForm,
  useSubmitFormResponse,
  useListFormResponses,
  useGetMe,
  getListFormResponsesQueryKey,
  getGetFormQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Download } from "lucide-react";

function canSeeResponses(role?: string, isCreator?: boolean) {
  return (
    isCreator ||
    role === "organizer" ||
    role === "admin" ||
    role === "faculty"
  );
}

export default function FormView() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { data: form, isLoading } = useGetForm(id, {
    query: { enabled: !!id, queryKey: getGetFormQueryKey(id) },
  });
  const submit = useSubmitFormResponse();
  const isCreator = form?.creatorId === me?.id;
  const { data: responses } = useListFormResponses(id, {
    query: {
      enabled: !!id && canSeeResponses(me?.role, isCreator),
      queryKey: getListFormResponsesQueryKey(id),
    },
  });

  const [values, setValues] = useState<Record<string, unknown>>({});

  const fieldList = useMemo(() => form?.fields ?? [], [form]);

  const set = (k: string, v: unknown) => setValues((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fieldList) {
      if (f.required && !values[f.key] && values[f.key] !== 0) {
        toast({
          title: "Missing required field",
          description: f.label,
          variant: "destructive",
        });
        return;
      }
    }
    try {
      await submit.mutateAsync({ id, data: { values } });
      qc.invalidateQueries({ queryKey: getListFormResponsesQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetFormQueryKey(id) });
      toast({ title: "Response submitted" });
      setValues({});
    } catch (e: any) {
      toast({
        title: "Could not submit",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  const handleExportResponses = async () => {
    if (!responses || !form) return;
    const XLSX = await import("xlsx");

    const rows = responses.map((r) => {
      const rowData: Record<string, any> = {
        "Response ID": r.id,
        "User Name": r.userName ?? "Anonymous",
        "Submitted At": format(new Date(r.createdAt), "yyyy-MM-dd HH:mm"),
      };

      fieldList.forEach((f) => {
        const val = (r.values as Record<string, any>)?.[f.key];
        rowData[f.label] = val === undefined || val === null ? "" : String(val);
      });

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Form Responses");

    const sanitizedTitle = form.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    XLSX.writeFile(workbook, `${sanitizedTitle}_responses_${Date.now()}.xlsx`);
  };

  if (isLoading || !form) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{form.title}</h1>
        {form.description && (
          <p className="text-muted-foreground text-lg">{form.description}</p>
        )}
      </div>

      <Tabs defaultValue="fill" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fill">Submit</TabsTrigger>
          {canSeeResponses(me?.role, isCreator) && (
            <TabsTrigger value="responses">
              Responses ({form.responseCount})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="fill">
          <form
            onSubmit={handleSubmit}
            className="bg-card border rounded-xl p-6 space-y-5"
          >
            {fieldList.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>
                  {f.label}
                  {f.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                {f.type === "text" && (
                  <Input
                    value={(values[f.key] as string) ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.type === "textarea" && (
                  <Textarea
                    rows={4}
                    value={(values[f.key] as string) ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.type === "number" && (
                  <Input
                    type="number"
                    value={(values[f.key] as number | string) ?? ""}
                    onChange={(e) =>
                      set(
                        f.key,
                        e.target.value === ""
                          ? ""
                          : Number(e.target.value),
                      )
                    }
                  />
                )}
                {f.type === "select" && (
                  <Select
                    value={(values[f.key] as string) ?? ""}
                    onValueChange={(v) => set(f.key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.type === "checkbox" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={Boolean(values[f.key])}
                      onCheckedChange={(v) => set(f.key, v === true)}
                    />
                    <span className="text-sm text-muted-foreground">Yes</span>
                  </div>
                )}
              </div>
            ))}
            <Button type="submit" disabled={submit.isPending}>
              Submit
            </Button>
          </form>
        </TabsContent>

        {canSeeResponses(me?.role, isCreator) && (
          <TabsContent value="responses" className="space-y-4">
            {responses && responses.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleExportResponses} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" /> Export Responses
                </Button>
              </div>
            )}
            {!responses || responses.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl py-12 text-center text-muted-foreground bg-muted/10">
                No responses yet.
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((r) => (
                  <div
                    key={r.id}
                    className="bg-card border rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {r.userName ?? "Anonymous"}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(r.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4 gap-y-2 text-sm">
                      {Object.entries(r.values ?? {}).map(([k, v]) => {
                        const def = fieldList.find((f) => f.key === k);
                        return (
                          <div key={k} className="contents">
                            <dt className="text-muted-foreground">
                              {def?.label ?? k}
                            </dt>
                            <dd className="font-medium break-words">
                              {String(v ?? "")}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
