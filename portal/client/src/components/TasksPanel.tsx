import { useEffect, useState } from "react";
import { api } from "../api";
import { APP_USERS, PRESET_TASKS, type Task } from "../types";
import { formatDate } from "../utils/format";
import { NotifySelect } from "./NotifySelect";

interface Props {
  leadId: string;
  currentUser: string;
}

export function TasksPanel({ leadId, currentUser }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [draft, setDraft] = useState("");
  const [notify, setNotify] = useState<string[]>([]);

  useEffect(() => {
    api.getTasks(leadId).then(setTasks);
  }, [leadId]);

  async function addTask(title: string) {
    if (!title.trim()) return;
    const created = await api.addTask(leadId, title.trim(), currentUser, currentUser, notify);
    setTasks((prev) => [...prev, created]);
    setDraft("");
    setNotify([]);
  }

  async function toggleStatus(task: Task) {
    const status = task.status === "Done" ? "Open" : "Done";
    const updated = await api.updateTask(leadId, task.id, { status });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function setAssignee(task: Task, assignee: string) {
    const updated = await api.updateTask(leadId, task.id, { assignee: assignee || null });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  }

  async function removeTask(task: Task) {
    await api.deleteTask(leadId, task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  const openCount = tasks.filter((t) => t.status !== "Done").length;

  return (
    <div className="rounded-lg border border-oak-line bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium uppercase tracking-wide text-oak-sage">Tasks</div>
        <div className="text-[12px] text-oak-sagelight">{openCount} open</div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESET_TASKS.map((preset) => (
          <button
            key={preset}
            onClick={() => addTask(preset)}
            className="rounded-full border border-oak-line px-2.5 py-1 text-[12px] font-medium text-oak-sage hover:border-oak-sage hover:text-oak-ink"
          >
            + {preset}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2 rounded-md border border-oak-line px-2.5 py-2">
            <input
              type="checkbox"
              checked={task.status === "Done"}
              onChange={() => toggleStatus(task)}
              className="h-4 w-4 accent-oak-dark"
            />
            <div className="flex-1">
              <div
                className={`text-[13px] ${
                  task.status === "Done" ? "text-oak-sagelight line-through" : "text-oak-ink"
                }`}
              >
                {task.title}
              </div>
              {task.status === "Done" && task.completed_at && (
                <div className="text-[11px] text-oak-sagelight">Done {formatDate(task.completed_at)}</div>
              )}
            </div>
            <select
              value={task.assignee ?? ""}
              onChange={(e) => setAssignee(task, e.target.value)}
              className="rounded-md border border-oak-line bg-white px-1.5 py-1 text-[12px] text-oak-ink"
            >
              <option value="">Unassigned</option>
              {APP_USERS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button
              onClick={() => removeTask(task)}
              className="rounded p-1 text-oak-sagelight hover:bg-black/[0.04] hover:text-red-700"
              aria-label="Remove task"
            >
              ×
            </button>
          </div>
        ))}
        {tasks.length === 0 && <div className="text-[13px] text-oak-sagelight">No tasks yet.</div>}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTask(draft);
            }
          }}
          placeholder="Add a custom task..."
          className="flex-1 rounded-md border border-oak-line bg-white px-3 py-2 text-sm focus:border-oak-sage focus:outline-none"
        />
        <button
          onClick={() => addTask(draft)}
          className="rounded-md border border-oak-line px-3 py-2 text-[13px] font-semibold text-oak-sage hover:border-oak-sage hover:text-oak-ink"
        >
          Add
        </button>
      </div>
      <div className="mt-2">
        <NotifySelect currentUser={currentUser} selected={notify} onChange={setNotify} />
      </div>
    </div>
  );
}
