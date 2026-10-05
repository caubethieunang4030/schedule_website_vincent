export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;

export type BodyType<T> = T;

export type AuthTokenGetter = () => Promise<string | null> | string | null;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

// ---------------------------------------------------------------------------
// Module-level configuration
// ---------------------------------------------------------------------------

let _baseUrl: string | null = null;
let _authTokenGetter: AuthTokenGetter | null = null;

/**
 * Set a base URL that is prepended to every relative request URL
 * (i.e. paths that start with `/`).
 *
 * Useful for Expo bundles that need to call a remote API server.
 * Pass `null` to clear the base URL.
 */
export function setBaseUrl(url: string | null): void {
  _baseUrl = url ? url.replace(/\/+$/, "") : null;
}

/**
 * Register a getter that supplies a bearer auth token.  Before every fetch
 * the getter is invoked; when it returns a non-null string, an
 * `Authorization: Bearer <token>` header is attached to the request.
 *
 * Useful for Expo bundles making token-gated API calls.
 * Pass `null` to clear the getter.
 *
 * NOTE: This function should never be used in web applications where session
 * token cookies are automatically associated with API calls by the browser.
 */
export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  _authTokenGetter = getter;
}

function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== "undefined" && input instanceof Request;
}

function resolveMethod(input: RequestInfo | URL, explicitMethod?: string): string {
  if (explicitMethod) return explicitMethod.toUpperCase();
  if (isRequest(input)) return input.method.toUpperCase();
  return "GET";
}

// Use loose check for URL — some runtimes (e.g. React Native) polyfill URL
// differently, so `instanceof URL` can fail.
function isUrl(input: RequestInfo | URL): input is URL {
  return typeof URL !== "undefined" && input instanceof URL;
}

function applyBaseUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (!_baseUrl) return input;
  const url = resolveUrl(input);
  // Only prepend to relative paths (starting with /)
  if (!url.startsWith("/")) return input;

  const absolute = `${_baseUrl}${url}`;
  if (typeof input === "string") return absolute;
  if (isUrl(input)) return new URL(absolute);
  return new Request(absolute, input as Request);
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (isUrl(input)) return input.toString();
  return input.url;
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();

  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null): boolean {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function isTextMediaType(mediaType: string | null): boolean {
  return Boolean(
    mediaType &&
      (mediaType.startsWith("text/") ||
        mediaType === "application/xml" ||
        mediaType === "text/xml" ||
        mediaType.endsWith("+xml") ||
        mediaType === "application/x-www-form-urlencoded"),
  );
}

// Use strict equality: in browsers, `response.body` is `null` when the
// response genuinely has no content.  In React Native, `response.body` is
// always `undefined` because the ReadableStream API is not implemented —
// even when the response carries a full payload readable via `.text()` or
// `.json()`.  Loose equality (`== null`) matches both `null` and `undefined`,
// which causes every React Native response to be treated as empty.
function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body === null) return true;
  return false;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;

  const candidate = (value as Record<string, unknown>)[key];
  if (typeof candidate !== "string") return undefined;

  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function truncate(text: string, maxLength = 300): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildErrorMessage(response: Response, data: unknown): string {
  const prefix = `HTTP ${response.status} ${response.statusText}`;

  if (typeof data === "string") {
    const text = data.trim();
    return text ? `${prefix}: ${truncate(text)}` : prefix;
  }

  const title = getStringField(data, "title");
  const detail = getStringField(data, "detail");
  const message =
    getStringField(data, "message") ??
    getStringField(data, "error_description") ??
    getStringField(data, "error");

  if (title && detail) return `${prefix}: ${title} — ${detail}`;
  if (detail) return `${prefix}: ${detail}`;
  if (message) return `${prefix}: ${message}`;
  if (title) return `${prefix}: ${title}`;

  return prefix;
}

export class ApiError<T = unknown> extends Error {
  readonly name = "ApiError";
  readonly status: number;
  readonly statusText: string;
  readonly data: T | null;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;

  constructor(
    response: Response,
    data: T | null,
    requestInfo: { method: string; url: string },
  ) {
    super(buildErrorMessage(response, data));
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.data = data;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
  }
}

export class ResponseParseError extends Error {
  readonly name = "ResponseParseError";
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  readonly response: Response;
  readonly method: string;
  readonly url: string;
  readonly rawBody: string;
  readonly cause: unknown;

  constructor(
    response: Response,
    rawBody: string,
    cause: unknown,
    requestInfo: { method: string; url: string },
  ) {
    super(
      `Failed to parse response from ${requestInfo.method} ${response.url || requestInfo.url} ` +
        `(${response.status} ${response.statusText}) as JSON`,
    );
    Object.setPrototypeOf(this, new.target.prototype);

    this.status = response.status;
    this.statusText = response.statusText;
    this.headers = response.headers;
    this.response = response;
    this.method = requestInfo.method;
    this.url = response.url || requestInfo.url;
    this.rawBody = rawBody;
    this.cause = cause;
  }
}

async function parseJsonBody(
  response: Response,
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  const raw = await response.text();
  const normalized = stripBom(raw);

  if (normalized.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch (cause) {
    throw new ResponseParseError(response, raw, cause, requestInfo);
  }
}

async function parseErrorBody(response: Response, method: string): Promise<unknown> {
  if (hasNoBody(response, method)) {
    return null;
  }

  const mediaType = getMediaType(response.headers);

  // Fall back to text when blob() is unavailable (e.g. some React Native builds).
  if (mediaType && !isJsonMediaType(mediaType) && !isTextMediaType(mediaType)) {
    return typeof response.blob === "function" ? response.blob() : response.text();
  }

  const raw = await response.text();
  const normalized = stripBom(raw);
  const trimmed = normalized.trim();

  if (trimmed === "") {
    return null;
  }

  if (isJsonMediaType(mediaType) || looksLikeJson(normalized)) {
    try {
      return JSON.parse(normalized);
    } catch {
      return raw;
    }
  }

  return raw;
}

function inferResponseType(response: Response): "json" | "text" | "blob" {
  const mediaType = getMediaType(response.headers);

  if (isJsonMediaType(mediaType)) return "json";
  if (isTextMediaType(mediaType) || mediaType == null) return "text";
  return "blob";
}

async function parseSuccessBody(
  response: Response,
  responseType: "json" | "text" | "blob" | "auto",
  requestInfo: { method: string; url: string },
): Promise<unknown> {
  if (hasNoBody(response, requestInfo.method)) {
    return null;
  }

  const effectiveType =
    responseType === "auto" ? inferResponseType(response) : responseType;

  switch (effectiveType) {
    case "json":
      return parseJsonBody(response, requestInfo);

    case "text": {
      const text = await response.text();
      return text === "" ? null : text;
    }

    case "blob":
      if (typeof response.blob !== "function") {
        throw new TypeError(
          "Blob responses are not supported in this runtime. " +
            "Use responseType \"json\" or \"text\" instead.",
        );
      }
      return response.blob();
  }
}

// ---------------------------------------------------------------------------
// LocalStorage Fallback Store for Standalone Static Hosting (Firebase)
// ---------------------------------------------------------------------------

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(`summit_mock_${key}`);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  return defaultVal;
}

function setStorage<T>(key: string, val: T): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(`summit_mock_${key}`, JSON.stringify(val));
    }
  } catch (e) {}
}

const DEFAULT_TASKS = [
  {
    id: "task_qr_prep_01",
    title: "Set up QR Scanning Stations at Main Auditorium",
    description: "Verify iPads and mobile scanners are connected to Wi-Fi and logged into Admin Check-in.",
    assigneeId: "user_admin_01",
    status: "in_progress",
    category: "daily_group_dump",
    priority: "urgent",
    seasonYear: "2025-2026",
    createdBy: "user_admin_01",
    checklists: [
      { id: "chk_01", title: "Check iPad battery levels", isCompleted: true },
      { id: "chk_02", title: "Test QR scanner app", isCompleted: false },
    ],
  },
  {
    id: "task_roster_import_02",
    title: "Final Roster Sync & Student Email Allowlist Check",
    description: "Ensure all newly enrolled students are imported via CSV in Admin > Roster.",
    assigneeId: "user_faculty_01",
    status: "todo",
    category: "personal_prep",
    priority: "high",
    seasonYear: "2025-2026",
    createdBy: "user_admin_01",
    checklists: [],
  },
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif_welcome_01",
    title: "🎉 Welcome to Learning Summit 2026!",
    body: "Please make sure to check in at the Main Auditorium by 8:00 AM for the Opening Keynote.",
    level: "info",
    createdAt: new Date().toISOString(),
  },
  {
    id: "notif_qr_reminder_02",
    title: "📱 Ready your QR Code for Check-in",
    body: "Have your My Schedule QR Code open on your mobile device for rapid scan at each session entrance.",
    level: "warning",
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_FORMS = [
  {
    id: "form_summit_feedback_01",
    title: "Overall Learning Summit Feedback Form",
    description: "Help us improve future summits by sharing your thoughts on session quality and organization.",
    sessionId: "session_keynote_01",
    fields: [
      { key: "q1_satisfaction", label: "Overall Satisfaction Rate", type: "select", required: true, options: ["Excellent", "Good", "Average", "Needs Improvement"] },
      { key: "q2_comments", label: "What was your favorite session or takeaway?", type: "textarea", required: false },
    ],
    creatorId: "user_admin_01",
    createdAt: new Date().toISOString(),
  },
];

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  input = applyBaseUrl(input);
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = resolveMethod(input, init.method);

  if (init.body != null && (method === "GET" || method === "HEAD")) {
    throw new TypeError(`customFetch: ${method} requests cannot have a body.`);
  }

  const headers = mergeHeaders(isRequest(input) ? input.headers : undefined, headersInit);

  if (
    typeof init.body === "string" &&
    !headers.has("content-type") &&
    looksLikeJson(init.body)
  ) {
    headers.set("content-type", "application/json");
  }

  if (responseType === "json" && !headers.has("accept")) {
    headers.set("accept", DEFAULT_JSON_ACCEPT);
  }

  if (_authTokenGetter && !headers.has("authorization")) {
    const token = await _authTokenGetter();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  const requestInfo = { method, url: resolveUrl(input) };

  try {
    const response = await fetch(input, { ...init, method, headers });

    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return (await parseSuccessBody(response, responseType, requestInfo)) as T;
      }
    }
  } catch (e) {
    // Network or static host fallback
  }

  // Graceful fallback for standalone static hosting (e.g. Firebase Hosting)
  const rawUrl = requestInfo.url;
  let pathname = rawUrl;
  try {
    const parsed = new URL(rawUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    pathname = parsed.pathname;
  } catch (e) {}

  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  const urlPath = pathname;

  if (urlPath === "/api/me") {


    let profile = getStorage("user_profile", {
      id: "user_admin_01",
      email: "admin@rabungap.org",
      firstName: "Vincent",
      lastName: "Admin",
      role: "admin",
      division: "all",
      imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=VincentAdmin",
    });

    if (method === "PATCH" || method === "PUT") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}
      profile = { ...profile, ...bodyData };
      setStorage("user_profile", profile);
    }

    return profile as T;
  }



  if (urlPath.includes("/api/users")) {
    return [
      {
        id: "user_admin_01",
        email: "admin@rabungap.org",
        firstName: "Vincent",
        lastName: "Admin",
        role: "admin",
        division: "all",
      },
      {
        id: "user_faculty_01",
        email: "teacher.smith@rabungap.org",
        firstName: "Sarah",
        lastName: "Smith",
        role: "faculty",
        division: "teachers",
      },
      {
        id: "user_student_01",
        email: "student.alex@student.rabungap.org",
        firstName: "Alex",
        lastName: "Johnson",
        role: "student",
        division: "upper",
      },
    ] as T;
  }

  if (urlPath.includes("/api/dashboard/summary")) {
    const currentTasks = getStorage("tasks", DEFAULT_TASKS);
    const regs = getStorage("registrations", ["session_keynote_01", "session_web_upper_01"]);
    const defaultSessions = [
      {
        id: "session_keynote_01",
        title: "Learning Summit 2026: Opening Keynote",
        description: "Welcome address by Head of School & keynote on Innovation in K-12 Education.",
        location: "Main Campus",
        room: "Grand Auditorium",
        track: "required_all",
        mandatory: true,
        capacity: 600,
        startsAt: "2026-09-09T08:00:00.000Z",
        endsAt: "2026-09-09T09:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Dr. Elizabeth Vance", title: "Head of School" }],
        tags: ["Keynote", "Plenary", "Mandatory"],
      },
      {
        id: "session_web_upper_01",
        title: "Full-Stack Web Development & Modern App Architecture",
        description: "Deep dive into TypeScript, Vite, React, Express, and Database design for Upper School.",
        location: "Innovation Hub",
        room: "Tech Center Lab B",
        track: "upper",
        mandatory: false,
        capacity: 40,
        startsAt: "2026-09-09T13:00:00.000Z",
        endsAt: "2026-09-09T14:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Vincent Huynh", title: "Lead Software Architect" }],
        tags: ["Web Dev", "Coding"],
      },
    ];

    let sessions = getStorage("sessions", defaultSessions);
    const nextSessions = sessions
      .filter((s: any) => regs.includes(s.id))
      .map((s: any) => ({ ...s, isRegistered: true }));

    return {
      totalSessions: sessions.length,
      totalAttendees: 240,
      myRegisteredSessions: regs.length,
      pendingTasks: currentTasks.filter((t: any) => t.status !== "completed").length,
      nextSessions: nextSessions.length > 0 ? nextSessions : [sessions[0]],
      trackDistribution: [
        { track: "required_all", count: 1 },
        { track: "lower", count: 1 },
        { track: "middle", count: 1 },
        { track: "upper", count: 1 },
        { track: "teachers", count: 1 },
      ],
    } as T;
  }


  if (urlPath.includes("/api/tasks")) {
    let tasks = getStorage("tasks", DEFAULT_TASKS);

    if (method === "GET") {
      return tasks as T;
    }

    if (method === "POST") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}

      const newTask = {
        id: `task_${Date.now()}`,
        title: bodyData.title ?? "New Task",
        description: bodyData.description ?? "",
        assigneeId: bodyData.assigneeId || "user_admin_01",
        status: bodyData.status ?? "todo",
        category: bodyData.category ?? "general",
        priority: bodyData.priority ?? "medium",
        seasonYear: bodyData.seasonYear ?? "2025-2026",
        dueAt: bodyData.dueAt ?? null,
        createdBy: "user_admin_01",
        createdAt: new Date().toISOString(),
        checklists: Array.isArray(bodyData.initialChecklist)
          ? bodyData.initialChecklist.map((title: string, i: number) => ({
              id: `chk_${Date.now()}_${i}`,
              title,
              isCompleted: false,
            }))
          : [],
      };

      tasks = [newTask, ...tasks];
      setStorage("tasks", tasks);
      return newTask as T;
    }

    if (method === "PATCH" || method === "PUT") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}

      const parts = urlPath.split("/");
      const targetId = parts[parts.length - 1];

      tasks = tasks.map((t: any) => (t.id === targetId ? { ...t, ...bodyData } : t));
      setStorage("tasks", tasks);
      return (tasks.find((t: any) => t.id === targetId) ?? bodyData) as T;
    }

    if (method === "DELETE") {
      const parts = urlPath.split("/");
      const targetId = parts[parts.length - 1];

      tasks = tasks.filter((t: any) => t.id !== targetId);
      setStorage("tasks", tasks);
      return { success: true } as T;
    }

    return tasks as T;
  }

  if (urlPath.includes("/api/notifications")) {
    let notifications = getStorage("notifications", DEFAULT_NOTIFICATIONS);

    if (method === "GET") {
      return notifications as T;
    }

    if (method === "POST") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}

      const newNotif = {
        id: `notif_${Date.now()}`,
        title: bodyData.title ?? "New Notification",
        body: bodyData.body ?? "",
        level: bodyData.level ?? "info",
        createdAt: new Date().toISOString(),
      };

      notifications = [newNotif, ...notifications];
      setStorage("notifications", notifications);
      return newNotif as T;
    }

    return notifications as T;
  }

  if (urlPath.includes("/api/forms")) {
    let forms = getStorage("forms", DEFAULT_FORMS);

    if (method === "GET") {
      return forms as T;
    }

    if (method === "POST") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}

      const newForm = {
        id: `form_${Date.now()}`,
        title: bodyData.title ?? "Untitled Form",
        description: bodyData.description ?? "",
        sessionId: bodyData.sessionId ?? null,
        fields: bodyData.fields ?? [],
        creatorId: "user_admin_01",
        createdAt: new Date().toISOString(),
      };

      forms = [newForm, ...forms];
      setStorage("forms", forms);
      return newForm as T;
    }

    return forms as T;
  }

  if (pathname.includes("/checkin") || pathname.includes("/attendance")) {
    return { success: true, message: "Check-in successful", timestamp: new Date().toISOString() } as T;
  }

  if (pathname.includes("/register") || pathname.includes("/unregister")) {
    let regs = getStorage("registrations", ["session_keynote_01", "session_web_upper_01"]);
    const parts = pathname.split("/");
    const registerIdx = parts.findIndex((p) => p === "register" || p === "unregister");
    const sId = registerIdx > 0 ? parts[registerIdx - 1] : parts[parts.length - 2];

    if (method === "POST") {
      if (sId && !regs.includes(sId)) {
        regs = [...regs, sId];
        setStorage("registrations", regs);
      }
      return { success: true, sessionId: sId } as T;
    }
    if (method === "DELETE") {
      if (sId) {
        regs = regs.filter((id: string) => id !== sId);
        setStorage("registrations", regs);
      }
      return { success: true } as T;
    }
  }

  if (pathname.includes("/api/students") || pathname.includes("/api/invited-students")) {
    let students = getStorage("invited_students", [
      { id: "invited_01", email: "student.alex@student.rabungap.org", firstName: "Alex", lastName: "Johnson", division: "upper" },
      { id: "invited_02", email: "student.emma@student.rabungap.org", firstName: "Emma", lastName: "Watson", division: "middle" },
      { id: "invited_03", email: "student.liam@student.rabungap.org", firstName: "Liam", lastName: "Brown", division: "lower" },
    ]);
    if (method === "GET") return students as T;
    if (method === "POST") {
      let bodyData: any = {};
      try {
        if (typeof init.body === "string") bodyData = JSON.parse(init.body);
      } catch (e) {}
      const newStudent = {
        id: `invited_${Date.now()}`,
        email: bodyData.email ?? "",
        firstName: bodyData.firstName ?? "",
        lastName: bodyData.lastName ?? "",
        division: bodyData.division ?? "all",
      };
      students = [newStudent, ...students];
      setStorage("invited_students", students);
      return newStudent as T;
    }
    return students as T;
  }

  if (pathname.includes("/api/me/registrations") || pathname.includes("/api/registrations")) {
    const regs = getStorage("registrations", ["session_keynote_01", "session_web_upper_01"]);
    const defaultSessions = [
      {
        id: "session_keynote_01",
        title: "Learning Summit 2026: Opening Keynote",
        description: "Welcome address by Head of School & keynote on Innovation in K-12 Education.",
        location: "Main Campus",
        room: "Grand Auditorium",
        track: "required_all",
        mandatory: true,
        capacity: 600,
        startsAt: "2026-09-09T08:00:00.000Z",
        endsAt: "2026-09-09T09:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Dr. Elizabeth Vance", title: "Head of School" }],
        tags: ["Keynote", "Plenary", "Mandatory"],
      },
      {
        id: "session_stem_lower_01",
        title: "STEM Explorers: Hands-on Robotics & Coding",
        description: "Interactive session for Lower School students building their first LEGO robotics project.",
        location: "Lower School Wing",
        room: "Robotics Lab 101",
        track: "lower",
        mandatory: false,
        capacity: 35,
        startsAt: "2026-09-09T09:00:00.000Z",
        endsAt: "2026-09-09T10:00:00.000Z",
        organizers: ["Sarah Smith"],
        speakers: [{ name: "Mark Davis", title: "STEM Coordinator" }],
        tags: ["STEM", "Robotics", "Hands-on"],
      },
      {
        id: "session_ai_middle_01",
        title: "AI & Digital Ethics in Daily School Life",
        description: "Understanding artificial intelligence tools, prompt engineering, and digital ethics.",
        location: "Middle School Building",
        room: "Room 204",
        track: "middle",
        mandatory: false,
        capacity: 45,
        startsAt: "2026-09-09T10:00:00.000Z",
        endsAt: "2026-09-09T11:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Elena Rostova", title: "Tech Integrator" }],
        tags: ["AI", "Digital Ethics"],
      },
      {
        id: "session_web_upper_01",
        title: "Full-Stack Web Development & Modern App Architecture",
        description: "Deep dive into TypeScript, Vite, React, Express, and Database design for Upper School.",
        location: "Innovation Hub",
        room: "Tech Center Lab B",
        track: "upper",
        mandatory: false,
        capacity: 40,
        startsAt: "2026-09-09T13:00:00.000Z",
        endsAt: "2026-09-09T14:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Vincent Huynh", title: "Lead Software Architect" }],
        tags: ["Web Dev", "Coding"],
      },
      {
        id: "session_faculty_edtech_01",
        title: "Faculty Workshop: AI-Assisted Lesson Planning",
        description: "Exclusive workshop for teachers on streamlining grading and creating personalized paths.",
        location: "Faculty Lounge",
        room: "Conference Room A",
        track: "teachers",
        mandatory: false,
        capacity: 30,
        startsAt: "2026-09-09T13:00:00.000Z",
        endsAt: "2026-09-09T14:00:00.000Z",
        organizers: ["Sarah Smith"],
        speakers: [{ name: "Sarah Smith", title: "Department Chair" }],
        tags: ["Faculty", "EdTech"],
      },
    ];
    let sessions = getStorage("sessions", defaultSessions);
    const registeredSessions = sessions.filter((s: any) => regs.includes(s.id)).map((s: any) => ({
      ...s,
      isRegistered: true,
    }));
    return registeredSessions as T;
  }

  if (pathname.includes("/api/sessions")) {
    const defaultSessions = [
      {
        id: "session_keynote_01",
        title: "Learning Summit 2026: Opening Keynote",
        description: "Welcome address by Head of School & keynote on Innovation in K-12 Education.",
        location: "Main Campus",
        room: "Grand Auditorium",
        track: "required_all",
        mandatory: true,
        capacity: 600,
        startsAt: "2026-09-09T08:00:00.000Z",
        endsAt: "2026-09-09T09:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Dr. Elizabeth Vance", title: "Head of School" }],
        tags: ["Keynote", "Plenary", "Mandatory"],
      },
      {
        id: "session_stem_lower_01",
        title: "STEM Explorers: Hands-on Robotics & Coding",
        description: "Interactive session for Lower School students building their first LEGO robotics project.",
        location: "Lower School Wing",
        room: "Robotics Lab 101",
        track: "lower",
        mandatory: false,
        capacity: 35,
        startsAt: "2026-09-09T09:00:00.000Z",
        endsAt: "2026-09-09T10:00:00.000Z",
        organizers: ["Sarah Smith"],
        speakers: [{ name: "Mark Davis", title: "STEM Coordinator" }],
        tags: ["STEM", "Robotics", "Hands-on"],
      },
      {
        id: "session_ai_middle_01",
        title: "AI & Digital Ethics in Daily School Life",
        description: "Understanding artificial intelligence tools, prompt engineering, and digital ethics.",
        location: "Middle School Building",
        room: "Room 204",
        track: "middle",
        mandatory: false,
        capacity: 45,
        startsAt: "2026-09-09T10:00:00.000Z",
        endsAt: "2026-09-09T11:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Elena Rostova", title: "Tech Integrator" }],
        tags: ["AI", "Digital Ethics"],
      },
      {
        id: "session_web_upper_01",
        title: "Full-Stack Web Development & Modern App Architecture",
        description: "Deep dive into TypeScript, Vite, React, Express, and Database design for Upper School.",
        location: "Innovation Hub",
        room: "Tech Center Lab B",
        track: "upper",
        mandatory: false,
        capacity: 40,
        startsAt: "2026-09-09T13:00:00.000Z",
        endsAt: "2026-09-09T14:00:00.000Z",
        organizers: ["Vincent Admin"],
        speakers: [{ name: "Vincent Huynh", title: "Lead Software Architect" }],
        tags: ["Web Dev", "Coding"],
      },
      {
        id: "session_faculty_edtech_01",
        title: "Faculty Workshop: AI-Assisted Lesson Planning",
        description: "Exclusive workshop for teachers on streamlining grading and creating personalized paths.",
        location: "Faculty Lounge",
        room: "Conference Room A",
        track: "teachers",
        mandatory: false,
        capacity: 30,
        startsAt: "2026-09-09T13:00:00.000Z",
        endsAt: "2026-09-09T14:00:00.000Z",
        organizers: ["Sarah Smith"],
        speakers: [{ name: "Sarah Smith", title: "Department Chair" }],
        tags: ["Faculty", "EdTech"],
      },
    ];

    let sessions = getStorage("sessions", defaultSessions);
    const regs = getStorage("registrations", ["session_keynote_01", "session_web_upper_01"]);

    sessions = sessions.map((s: any) => ({
      ...s,
      isRegistered: regs.includes(s.id),
      registeredCount: (s.registeredCount ?? 15) + (regs.includes(s.id) ? 1 : 0),
    }));

    const parts = pathname.split("/");
    const lastPart = parts[parts.length - 1];

    if (lastPart && lastPart !== "sessions" && !lastPart.includes("?")) {
      const found = sessions.find((s: any) => s.id === lastPart);
      return (found || sessions[0]) as T;
    }

    return sessions as T;
  }


  return [] as T;
}


