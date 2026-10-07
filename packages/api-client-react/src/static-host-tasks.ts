const TASK_STATUSES = ["todo", "in_progress", "done", "blocked"] as const;

export type MockTaskStatus = (typeof TASK_STATUSES)[number];

export type MockChecklist = {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
  createdAt: string;
};

export type MockTask = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  status: MockTaskStatus;
  category: string;
  priority: string;
  seasonYear: string;
  dueAt: string | null;
  createdBy: string;
  createdAt: string;
  checklists: MockChecklist[];
};

export const DEFAULT_TASKS: MockTask[] = [
  {
    id: "task_qr_prep_01",
    title: "Set up QR Scanning Stations at Main Auditorium",
    description:
      "Verify iPads and mobile scanners are connected to Wi-Fi and logged into Admin Check-in.",
    assigneeId: "user_admin_01",
    status: "in_progress",
    category: "daily_group_dump",
    priority: "urgent",
    seasonYear: "2025-2026",
    dueAt: null,
    createdBy: "user_admin_01",
    createdAt: "2026-04-01T12:00:00.000Z",
    checklists: [
      {
        id: "chk_01",
        taskId: "task_qr_prep_01",
        title: "Check iPad battery levels",
        isCompleted: true,
        order: 0,
        createdAt: "2026-04-01T12:00:00.000Z",
      },
      {
        id: "chk_02",
        taskId: "task_qr_prep_01",
        title: "Test QR scanner app",
        isCompleted: false,
        order: 1,
        createdAt: "2026-04-01T12:00:00.000Z",
      },
    ],
  },
  {
    id: "task_roster_import_02",
    title: "Final Roster Sync & Student Email Allowlist Check",
    description:
      "Ensure all newly enrolled students are imported via CSV in Admin > Roster.",
    assigneeId: "user_faculty_01",
    status: "todo",
    category: "personal_prep",
    priority: "high",
    seasonYear: "2025-2026",
    dueAt: null,
    createdBy: "user_admin_01",
    createdAt: "2026-04-01T12:05:00.000Z",
    checklists: [],
  },
];

function isStatus(value: unknown): value is MockTaskStatus {
  return TASK_STATUSES.includes(value as MockTaskStatus);
}

function asIsoDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeChecklist(
  taskId: string,
  item: unknown,
  index: number,
): MockChecklist {
  const now = new Date().toISOString();
  if (typeof item === "string") {
    return {
      id: `chk_${taskId}_${index}`,
      taskId,
      title: item,
      isCompleted: false,
      order: index,
      createdAt: now,
    };
  }
  const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
  return {
    id: String(row.id ?? `chk_${taskId}_${index}`),
    taskId: String(row.taskId ?? taskId),
    title: String(row.title ?? "Checklist item"),
    isCompleted: Boolean(row.isCompleted),
    order: typeof row.order === "number" ? row.order : index,
    createdAt: asIsoDate(row.createdAt) ?? now,
  };
}

export function normalizeTask(raw: unknown, index = 0): MockTask {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(row.id ?? `task_${Date.now()}_${index}`);
  const checklistSource = Array.isArray(row.checklists)
    ? row.checklists
    : Array.isArray(row.initialChecklist)
      ? row.initialChecklist
      : [];
  return {
    id,
    title: String(row.title ?? "Untitled task"),
    description: String(row.description ?? ""),
    assigneeId: String(row.assigneeId || "user_admin_01"),
    status: isStatus(row.status) ? row.status : "todo",
    category: String(row.category ?? "general"),
    priority: String(row.priority ?? "medium"),
    seasonYear: String(row.seasonYear ?? "2025-2026"),
    dueAt: asIsoDate(row.dueAt),
    createdBy: String(row.createdBy ?? "user_admin_01"),
    createdAt: asIsoDate(row.createdAt) ?? new Date().toISOString(),
    checklists: checklistSource.map((item, i) => normalizeChecklist(id, item, i)),
  };
}

export function loadTasks(raw: unknown): MockTask[] {
  if (!Array.isArray(raw)) return DEFAULT_TASKS.map((t) => normalizeTask(t));
  return raw.map((item, i) => normalizeTask(item, i));
}

export function handleTasksFallback(
  urlPath: string,
  method: string,
  body: unknown,
  stored: unknown,
): { matched: false } | { matched: true; tasks: MockTask[]; response: unknown } {
  const tasksRoot = urlPath === "/api/tasks";
  const exportMatch = urlPath === "/api/tasks/export";
  const checklistMatch = urlPath.match(
    /^\/api\/tasks\/([^/]+)\/checklists(?:\/([^/]+))?$/,
  );
  const taskMatch =
    !checklistMatch && !exportMatch
      ? urlPath.match(/^\/api\/tasks\/([^/]+)$/)
      : null;

  if (!tasksRoot && !exportMatch && !checklistMatch && !taskMatch) {
    return { matched: false };
  }

  let tasks = loadTasks(stored);
  const verb = method.toUpperCase();
  const bodyData =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  if (exportMatch && verb === "GET") {
    return {
      matched: true,
      tasks,
      response: {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assigneeName: null,
          assigneeEmail: null,
          status: t.status,
          category: t.category,
          priority: t.priority,
          seasonYear: t.seasonYear,
          dueAt: t.dueAt,
          completedAt: null,
          createdAt: t.createdAt,
        })),
        sessions: [],
      },
    };
  }

  if (checklistMatch) {
    const taskId = checklistMatch[1];
    const checklistId = checklistMatch[2];
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      return { matched: true, tasks, response: { error: "Task not found" } };
    }

    if (verb === "POST") {
      const item = normalizeChecklist(
        taskId,
        { title: bodyData.title ?? "Checklist item" },
        task.checklists.length,
      );
      task.checklists = [...task.checklists, item];
      return { matched: true, tasks, response: item };
    }

    if ((verb === "PATCH" || verb === "PUT") && checklistId) {
      task.checklists = task.checklists.map((item) =>
        item.id === checklistId
          ? {
              ...item,
              title:
                typeof bodyData.title === "string" ? bodyData.title : item.title,
              isCompleted:
                typeof bodyData.isCompleted === "boolean"
                  ? bodyData.isCompleted
                  : item.isCompleted,
            }
          : item,
      );
      const updated = task.checklists.find((item) => item.id === checklistId);
      return { matched: true, tasks, response: updated ?? { error: "Not found" } };
    }

    if (verb === "DELETE" && checklistId) {
      task.checklists = task.checklists.filter((item) => item.id !== checklistId);
      return { matched: true, tasks, response: { success: true } };
    }
  }

  if (tasksRoot && verb === "GET") {
    return { matched: true, tasks, response: tasks };
  }

  if (tasksRoot && verb === "POST") {
    const newTask = normalizeTask({
      ...bodyData,
      id: `task_${Date.now()}`,
      createdAt: new Date().toISOString(),
      checklists: Array.isArray(bodyData.initialChecklist)
        ? bodyData.initialChecklist
        : [],
    });
    tasks = [newTask, ...tasks];
    return { matched: true, tasks, response: newTask };
  }

  if (taskMatch && (verb === "PATCH" || verb === "PUT")) {
    const targetId = taskMatch[1];
    const { initialChecklist: _ignored, checklists: incomingChecklists, ...rest } =
      bodyData;
    tasks = tasks.map((t) => {
      if (t.id !== targetId) return t;
      return normalizeTask({
        ...t,
        ...rest,
        checklists: Array.isArray(incomingChecklists)
          ? incomingChecklists
          : t.checklists,
      });
    });
    return {
      matched: true,
      tasks,
      response: tasks.find((t) => t.id === targetId) ?? rest,
    };
  }

  if (taskMatch && verb === "DELETE") {
    const targetId = taskMatch[1];
    tasks = tasks.filter((t) => t.id !== targetId);
    return { matched: true, tasks, response: { success: true } };
  }

  if (tasksRoot || taskMatch || checklistMatch || exportMatch) {
    return { matched: true, tasks, response: tasks };
  }

  return { matched: false };
}
