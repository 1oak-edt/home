import type { Alert, ChatMessage, Comment, Lead, LeadDocument, Metrics, NewLeadInput, Stage, Task } from "./types";

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  getLeads: () => fetch(`${BASE}/leads`).then((r) => handle<Lead[]>(r)),

  getLead: (id: string) => fetch(`${BASE}/leads/${id}`).then((r) => handle<Lead>(r)),

  getMetrics: () => fetch(`${BASE}/metrics`).then((r) => handle<Metrics>(r)),

  createLead: (input: NewLeadInput) =>
    fetch(`${BASE}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => handle<Lead>(r)),

  updateLead: (id: string, input: Partial<NewLeadInput>) =>
    fetch(`${BASE}/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => handle<Lead>(r)),

  changeStage: (id: string, stage: Stage, reason?: string | null) =>
    fetch(`${BASE}/leads/${id}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, reason }),
    }).then((r) => handle<Lead>(r)),

  deleteLead: (id: string) =>
    fetch(`${BASE}/leads/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  getHistory: (id: string) => fetch(`${BASE}/leads/${id}/history`).then((r) => handle<any[]>(r)),

  getComments: (leadId: string) =>
    fetch(`${BASE}/leads/${leadId}/comments`).then((r) => handle<Comment[]>(r)),

  addComment: (leadId: string, author: string, body: string, notify?: string[]) =>
    fetch(`${BASE}/leads/${leadId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, body, notify }),
    }).then((r) => handle<Comment>(r)),

  getChat: (leadId: string) => fetch(`${BASE}/leads/${leadId}/chat`).then((r) => handle<ChatMessage[]>(r)),

  sendChat: (leadId: string, author: string, body: string, notify?: string[]) =>
    fetch(`${BASE}/leads/${leadId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, body, notify }),
    }).then((r) => handle<ChatMessage>(r)),

  getTasks: (leadId: string) => fetch(`${BASE}/leads/${leadId}/tasks`).then((r) => handle<Task[]>(r)),

  addTask: (leadId: string, title: string, assignee?: string | null, createdBy?: string, notify?: string[]) =>
    fetch(`${BASE}/leads/${leadId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, assignee, created_by: createdBy, notify }),
    }).then((r) => handle<Task>(r)),

  updateTask: (leadId: string, taskId: string, patch: Partial<Pick<Task, "title" | "assignee" | "status">>) =>
    fetch(`${BASE}/leads/${leadId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => handle<Task>(r)),

  deleteTask: (leadId: string, taskId: string) =>
    fetch(`${BASE}/leads/${leadId}/tasks/${taskId}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  getDocuments: (leadId: string) =>
    fetch(`${BASE}/leads/${leadId}/documents`).then((r) => handle<LeadDocument[]>(r)),

  uploadDocument: (leadId: string, category: string, file: File, uploadedBy: string, notify?: string[]) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("uploaded_by", uploadedBy);
    if (notify?.length) form.append("notify", JSON.stringify(notify));
    return fetch(`${BASE}/leads/${leadId}/documents`, { method: "POST", body: form }).then((r) =>
      handle<LeadDocument>(r)
    );
  },

  deleteDocument: (leadId: string, docId: string) =>
    fetch(`${BASE}/leads/${leadId}/documents/${docId}`, { method: "DELETE" }).then((r) => handle<void>(r)),

  documentDownloadUrl: (leadId: string, docId: string) => `${BASE}/leads/${leadId}/documents/${docId}/download`,

  uploadExecSummary: (leadId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/leads/${leadId}/exec-summary`, { method: "POST", body: form }).then((r) =>
      handle<{ filename: string; highlights: string[]; uploaded_at: string }>(r)
    );
  },

  execSummaryFileUrl: (leadId: string) => `${BASE}/leads/${leadId}/exec-summary/file`,

  getAlerts: (user: string, unreadOnly?: boolean) =>
    fetch(`${BASE}/alerts?user=${encodeURIComponent(user)}${unreadOnly ? "&unread=true" : ""}`).then((r) =>
      handle<Alert[]>(r)
    ),

  getUnreadAlertCount: (user: string) =>
    fetch(`${BASE}/alerts/unread-count?user=${encodeURIComponent(user)}`).then((r) =>
      handle<{ count: number }>(r)
    ),

  markAlertRead: (id: string) => fetch(`${BASE}/alerts/${id}/read`, { method: "POST" }).then((r) => handle<void>(r)),

  markAllAlertsRead: (user: string) =>
    fetch(`${BASE}/alerts/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user }),
    }).then((r) => handle<void>(r)),
};
