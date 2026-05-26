import { useState } from "react";
import { useLocation } from "wouter";
import {
  useCreateForm,
  useListSessions,
  getListFormsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

type FieldType = "text" | "textarea" | "number" | "select" | "checkbox";

interface BuilderField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string;
}

const defaultField = (): BuilderField => ({
  key: `field_${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  type: "text",
  required: false,
  options: "",
});

export default function FormBuilder() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreateForm();
  const { data: sessions } = useListSessions();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string>("none");
  const [fields, setFields] = useState<BuilderField[]>([defaultField()]);

  const update = (i: number, patch: Partial<BuilderField>) =>
    setFields((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const move = (i: number, dir: -1 | 1) => {
    setFields((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const next = [...arr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const remove = (i: number) =>
    setFields((arr) => arr.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (fields.length === 0) {
      toast({ title: "Add at least one field", variant: "destructive" });
      return;
    }
    if (fields.some((f) => !f.label.trim())) {
      toast({ title: "All fields need labels", variant: "destructive" });
      return;
    }
    try {
      const created = await create.mutateAsync({
        data: {
          title,
          description: description || undefined,
          sessionId: sessionId === "none" ? undefined : sessionId,
          fields: fields.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
            options:
              f.type === "select"
                ? f.options
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean)
                : undefined,
          })),
        },
      });
      qc.invalidateQueries({ queryKey: getListFormsQueryKey() });
      toast({ title: "Form created" });
      setLocation(`/app/forms/${created.id}`);
    } catch (e: any) {
      toast({
        title: "Could not create form",
        description: e?.message ?? "",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 pb-10 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">New form</h1>
        <p className="text-muted-foreground">
          Build a custom form for any moment of the summit.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="End of summit reflection"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this form for?"
          />
        </div>
        <div className="space-y-2">
          <Label>Tied to a session (optional)</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {(sessions ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Fields</h2>
          <Button
            variant="outline"
            onClick={() => setFields((arr) => [...arr, defaultField()])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.key} className="bg-card border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium w-6 text-center">
                  {i + 1}
                </span>
                <Input
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Question label"
                  className="flex-1"
                />
                <Select
                  value={f.type}
                  onValueChange={(v) => update(i, { type: v as FieldType })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Short text</SelectItem>
                    <SelectItem value="textarea">Long text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => move(i, 1)}
                  disabled={i === fields.length - 1}
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {f.type === "select" && (
                <div className="pl-8 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Options (comma-separated)
                  </Label>
                  <Input
                    value={f.options}
                    onChange={(e) => update(i, { options: e.target.value })}
                    placeholder="Lower, Middle, Upper"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 pl-8">
                <Switch
                  id={`req-${i}`}
                  checked={f.required}
                  onCheckedChange={(v) => update(i, { required: v })}
                />
                <Label htmlFor={`req-${i}`} className="text-sm">
                  Required
                </Label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={create.isPending}>
          Create form
        </Button>
        <Button variant="ghost" onClick={() => setLocation("/app/forms")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
