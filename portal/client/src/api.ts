import type { Alert, ChatMessage, Comment, Lead, LeadDocument, Metrics, NewLeadInput, Stage, Task } from "./types";
import { auth } from "./firebase";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

function json(body: unknown): RequestInit {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const api = {
  getLeads: () => authFetch(`${BASE}/leads`).then((r) => handle<Lead[]>(r)),

  getLead: (id: string) => authFetch(`${BASE}/leads/${id}`).then((r) => handle<Lead>(r)),

  getMetrics: () => authFetch(`${BASE}/metrics`).then((r) => handle<Metrics>(r)),

  createLead: (input: NewLeadInput) =>
    authFetch(`${BASE}/leads`, { method: "POST", ...json(input) }).then((r) => handle<Lead>(r)),

  updateLead: (id: string, input: Partial<NewLeadInput>) =>
    authFetch(`${BASE}/leads/${id}`, { method: "PATCH", ...json(input) }).then((r) => handle<Lead>(r)),

  changeStage: (id: string, stage: Stage, reason?: string | null) =>
    authFetch(`${BASE}/leads/${id}/stage`, { method: "POST", ...json({ stage, reason }) }).then((r) =>
      handle<Lead>(r)
    ),

  deleteLead: (id: string) =>
    authFetch(`${BASE}/leads/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  getHistory: (id: string) => authFetch(`${BASE}/leads/${id}/history`).then((r) => handle<any[]>(r)),

  getComments: (leadId: string) =>
    authFetch(`${BASE}/leads/${leadId}/comments`).then((r) => handle<Comment[]>(r)),

  addComment: (leadId: string, author: string, body: string, notify?: string[]) =>
    authFetch(`${BASE}/leads/${leadId}/comments`, { method: "POST", ...json({ author, body, notify }) }).then((r) =>
      handle<Comment>(r)
    ),

  getChat: (leadId: string) => authFetch(`${BASE}/leads/${leadId}/chat`).then((r) => handle<ChatMessage[]>(r)),

  sendChat: (leadId: string, author: string, body: string, notify?: string[]) =>
    authFetch(`${BASE}/leads/${leadId}/chat`, { method: "POST", ...json({ author, body, notify }) }).then((r) =>
      handle<ChatMessage>(r)
    ),

  getTasks: (leadId: string) => authFetch(`${BASE}/leads/${leadId}/tasks`).then((r) => handle<Task[]>(r)),

  addTask: (leadId: string, title: string, assignee?: string | null, createdBy?: string, notify?: string[]) =>
    authFetch(`${BASE}/leads/${leadId}/tasks`, {
      method: "POST",
      ...json({ title, assignee, created_by: createdBy, notify }),
    }).then((r) => handle<Task>(r)),

  updateTask: (leadId: string, taskId: string, patch: Partial<Pick<Task, "title" | "assignee" | "status">>) =>
    authFetch(`${BASE}/leads/${leadId}/tasks/${taskId}`, { method: "PATCH", ...json(patch) }).then((r) =>
      handle<Task>(r)
    ),

  deleteTask: (leadId: string, taskId: string) =>
    authFetch(`${BASE}/leads/${leadId}/tasks/${taskId}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  getDocuments: (leadId: string) =>
    authFetch(`${BASE}/leads/${leadId}/documents`).then((r) => handle<LeadDocument[]>(r)),

  uploadDocument: (leadId: string, category: string, file: File, uploadedBy: string, notify?: string[]) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("uploaded_by", uploadedBy);
    if (notify?.length) form.append("notify", JSON.stringify(notify));
    return authFetch(`${BASE}/leads/${leadId}/documents`, { method: "POST", body: form }).then((r) =>
      handle<LeadDocument>(r)
    );
  },

  deleteDocument: (leadId: string, docId: string) =>
    authFetch(`${BASE}/leads/${leadId}/documents/${docId}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  downloadDocument: async (leadId: string, docId: string, filename: string) => {
    const res = await authFetch(`${BASE}/leads/${leadId}/documents/${docId}/download`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  uploadExecSummary: (leadId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return authFetch(`${BASE}/leads/${leadId}/exec-summary`, { method: "POST", body: form }).then((r) =>
      handle<{ filename: string; highlights: string[]; uploaded_at: string }>(r)
    );
  },

  openExecSummaryFile: async (leadId: string) => {
    const res = await authFetch(`${BASE}/leads/${leadId}/exec-summary/file`);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },

  getAlerts: (user: string, unreadOnly?: boolean) =>
    authFetch(`${BASE}/alerts?user=${encodeURIComponent(user)}${unreadOnly ? "&unread=true" : ""}`).then((r) =>
      handle<Alert[]>(r)
    ),

  getUnreadAlertCount: (user: string) =>
    authFetch(`${BASE}/alerts/unread-count?user=${encodeURIComponent(user)}`).then((r) =>
      handle<{ count: number }>(r)
    ),

  markAlertRead: (id: string) =>
    authFetch(`${BASE}/alerts/${id}/read`, { method: "POST" }).then((r) => handle<void>(r)),

  markAllAlertsRead: (user: string) =>
    authFetch(`${BASE}/alerts/read-all`, { method: "POST", ...json({ user }) }).then((r) => handle<void>(r)),
};
