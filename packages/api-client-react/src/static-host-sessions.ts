export const DEFAULT_REG_IDS = ["session_keynote_01", "session_web_upper_01"];

export const DEFAULT_SESSIONS = [
  {
    id: "session_keynote_01",
    title: "Learning Summit 2026: Opening Keynote",
    description:
      "Welcome address by Head of School & keynote on Innovation in K-12 Education.",
    location: "Main Campus",
    room: "Grand Auditorium",
    track: "required_all",
    mandatory: true,
    capacity: 600,
    registeredCount: 240,
    startsAt: "2026-09-09T08:00:00.000Z",
    endsAt: "2026-09-09T09:00:00.000Z",
    organizers: ["Vincent Admin"],
    speakers: [{ name: "Dr. Elizabeth Vance", title: "Head of School" }],
    tags: ["Keynote", "Plenary", "Mandatory"],
  },
  {
    id: "session_stem_lower_01",
    title: "STEM Explorers: Hands-on Robotics & Coding",
    description:
      "Interactive session for Lower School students building their first LEGO robotics project.",
    location: "Lower School Wing",
    room: "Robotics Lab 101",
    track: "lower",
    mandatory: false,
    capacity: 35,
    registeredCount: 12,
    startsAt: "2026-09-09T09:00:00.000Z",
    endsAt: "2026-09-09T10:00:00.000Z",
    organizers: ["Sarah Smith"],
    speakers: [{ name: "Mark Davis", title: "STEM Coordinator" }],
    tags: ["STEM", "Robotics", "Hands-on"],
  },
  {
    id: "session_ai_middle_01",
    title: "AI & Digital Ethics in Daily School Life",
    description:
      "Understanding artificial intelligence tools, prompt engineering, and digital ethics.",
    location: "Middle School Building",
    room: "Room 204",
    track: "middle",
    mandatory: false,
    capacity: 45,
    registeredCount: 20,
    startsAt: "2026-09-09T10:00:00.000Z",
    endsAt: "2026-09-09T11:00:00.000Z",
    organizers: ["Vincent Admin"],
    speakers: [{ name: "Elena Rostova", title: "Tech Integrator" }],
    tags: ["AI", "Digital Ethics"],
  },
  {
    id: "session_web_upper_01",
    title: "Full-Stack Web Development & Modern App Architecture",
    description:
      "Deep dive into TypeScript, Vite, React, Express, and Database design for Upper School.",
    location: "Innovation Hub",
    room: "Tech Center Lab B",
    track: "upper",
    mandatory: false,
    capacity: 40,
    registeredCount: 18,
    startsAt: "2026-09-09T13:00:00.000Z",
    endsAt: "2026-09-09T14:00:00.000Z",
    organizers: ["Vincent Admin"],
    speakers: [{ name: "Vincent Huynh", title: "Lead Software Architect" }],
    tags: ["Web Dev", "Coding"],
  },
  {
    id: "session_faculty_edtech_01",
    title: "Faculty Workshop: AI-Assisted Lesson Planning",
    description:
      "Exclusive workshop for teachers on streamlining grading and creating personalized paths.",
    location: "Faculty Lounge",
    room: "Conference Room A",
    track: "teachers",
    mandatory: false,
    capacity: 30,
    registeredCount: 8,
    startsAt: "2026-09-09T13:00:00.000Z",
    endsAt: "2026-09-09T14:00:00.000Z",
    organizers: ["Sarah Smith"],
    speakers: [{ name: "Sarah Smith", title: "Department Chair" }],
    tags: ["Faculty", "EdTech"],
  },
];

export function loadSessions(raw: unknown) {
  return Array.isArray(raw) ? raw : DEFAULT_SESSIONS.map((s) => ({ ...s }));
}

export function loadRegIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_REG_IDS];
  return raw
    .map((item) => (typeof item === "string" ? item : (item as { sessionId?: string })?.sessionId))
    .filter((id): id is string => Boolean(id));
}

function decorate(sessions: any[], regs: string[]) {
  return sessions.map((s) => ({
    ...s,
    isRegistered: regs.includes(s.id),
    registeredCount: Number(s.registeredCount ?? 0),
    capacity: Number(s.capacity ?? 0),
  }));
}

export function handleSessionsFallback(
  urlPath: string,
  method: string,
  body: unknown,
  storedSessions: unknown,
  storedRegs: unknown,
): { matched: false } | { matched: true; sessions: any[]; regs: string[]; response: unknown } {
  const verb = method.toUpperCase();
  const bodyData = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  let sessions = loadSessions(storedSessions);
  let regs = loadRegIds(storedRegs);

  const myRegs = urlPath === "/api/me/registrations";
  const registerMatch = urlPath.match(/^\/api\/sessions\/([^/]+)\/register$/);
  const checkinMatch = urlPath.match(/^\/api\/sessions\/([^/]+)\/(checkin|attendance)$/);
  const sessionMatch = urlPath.match(/^\/api\/sessions(?:\/([^/]+))?$/);

  if (!myRegs && !registerMatch && !checkinMatch && !sessionMatch) {
    return { matched: false };
  }

  if (myRegs && verb === "GET") {
    const listed = decorate(sessions, regs).filter((s) => regs.includes(s.id));
    return { matched: true, sessions, regs, response: listed };
  }

  if (registerMatch) {
    const sessionId = registerMatch[1];
    if (verb === "POST") {
      if (!regs.includes(sessionId)) regs = [...regs, sessionId];
      sessions = sessions.map((s) =>
        s.id === sessionId
          ? { ...s, registeredCount: Number(s.registeredCount ?? 0) + 1, isRegistered: true }
          : s,
      );
      return {
        matched: true,
        sessions,
        regs,
        response: {
          id: `reg_${sessionId}`,
          sessionId,
          userId: "user_admin_01",
          createdAt: new Date().toISOString(),
        },
      };
    }
    if (verb === "DELETE") {
      regs = regs.filter((id) => id !== sessionId);
      sessions = sessions.map((s) =>
        s.id === sessionId ? { ...s, isRegistered: false } : s,
      );
      return { matched: true, sessions, regs, response: { success: true } };
    }
  }

  if (checkinMatch && (verb === "POST" || verb === "GET")) {
    return {
      matched: true,
      sessions,
      regs,
      response:
        verb === "GET"
          ? []
          : {
              success: true,
              message: "Check-in successful",
              timestamp: new Date().toISOString(),
            },
    };
  }

  if (sessionMatch) {
    const id = sessionMatch[1];
    if (verb === "GET" && !id) {
      return { matched: true, sessions, regs, response: decorate(sessions, regs) };
    }
    if (verb === "GET" && id) {
      const found = decorate(sessions, regs).find((s) => s.id === id);
      return { matched: true, sessions, regs, response: found ?? { error: "Not found" } };
    }
    if (verb === "POST" && !id) {
      const sessionId = `session_${Date.now()}`;
      const created = {
        title: "New Summit Session",
        description: "",
        location: "Main Campus",
        room: "Room 101",
        track: "all",
        mandatory: false,
        organizers: ["Vincent Admin"],
        speakers: [],
        tags: [],
        ...bodyData,
        id: sessionId,
        capacity: Number(bodyData.capacity) || 50,
        registeredCount: 0,
        isRegistered: false,
        startsAt: bodyData.startsAt ?? new Date().toISOString(),
        endsAt: bodyData.endsAt ?? new Date(Date.now() + 3600000).toISOString(),
      };
      sessions = [created, ...sessions];
      return { matched: true, sessions, regs, response: created };
    }
    if ((verb === "PATCH" || verb === "PUT") && id) {
      sessions = sessions.map((s) => (s.id === id ? { ...s, ...bodyData, id: s.id } : s));
      const updated = decorate(sessions, regs).find((s) => s.id === id);
      return { matched: true, sessions, regs, response: updated ?? { error: "Not found" } };
    }
    if (verb === "DELETE" && id) {
      sessions = sessions.filter((s) => s.id !== id);
      regs = regs.filter((regId) => regId !== id);
      return { matched: true, sessions, regs, response: { success: true } };
    }
  }

  return { matched: false };
}
