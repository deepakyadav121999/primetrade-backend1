"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────

type TaskStatus   = "todo" | "in_progress" | "done";
type TaskPriority = "low" | "medium" | "high";

interface Task {
  id:          number;
  title:       string;
  description: string | null;
  status:      TaskStatus;
  priority:    TaskPriority;
  due_date:    string | null;
  created_at:  string;
}

interface User {
  id:    number;
  name:  string;
  email: string;
  role:  "user" | "admin";
}

interface AdminUser extends User {
  created_at: string;
}

interface Toast {
  id:   number;
  type: "success" | "error";
  msg:  string;
}

// ── Constants ─────────────────────────────────────────────────────

const STATUS_COLS: { key: TaskStatus; label: string; dot: string }[] = [
  { key: "todo",        label: "To Do",       dot: "bg-gray-500" },
  { key: "in_progress", label: "In Progress",  dot: "bg-brand-500" },
  { key: "done",        label: "Done",         dot: "bg-green-500" },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low:    "bg-green-500/15 text-green-400",
  medium: "bg-amber-500/15 text-amber-400",
  high:   "bg-red-500/15   text-red-400",
};

const EMPTY_FORM = {
  title:       "",
  description: "",
  status:      "todo"        as TaskStatus,
  priority:    "medium"      as TaskPriority,
  due_date:    "",
};

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [user,       setUser]       = useState<User | null>(null);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"tasks" | "admin">("tasks");

  // Task modal state
  const [modal,     setModal]     = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filters
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // ── Auth helpers ──────────────────────────────────────────────

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";

  const authHeaders = () => ({
    Authorization:  `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  // ── Toast ─────────────────────────────────────────────────────

  const toast = useCallback((type: Toast["type"], msg: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ── Load tasks ────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus)   params.set("status",   filterStatus);
    if (filterPriority) params.set("priority", filterPriority);

    const res = await fetch(`/api/v1/tasks?${params}`, { headers: authHeaders() });
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    if (data.success) setTasks(data.data);
  }, [filterStatus, filterPriority]); // eslint-disable-line

  // ── Load admin users ──────────────────────────────────────────

  const loadAdminUsers = useCallback(async () => {
    const res = await fetch("/api/v1/admin/users", { headers: authHeaders() });
    const data = await res.json();
    if (data.success) setAdminUsers(data.data);
  }, []); // eslint-disable-line

  // ── Bootstrap ─────────────────────────────────────────────────

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (!raw) { router.push("/login"); return; }
    setUser(JSON.parse(raw));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (user) loadTasks();
  }, [user, loadTasks]);

  useEffect(() => {
    if (tab === "admin" && user?.role === "admin") loadAdminUsers();
  }, [tab, user, loadAdminUsers]);

  // ── Task CRUD ─────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(t: Task) {
    setEditingId(t.id);
    setForm({
      title:       t.title,
      description: t.description ?? "",
      status:      t.status,
      priority:    t.priority,
      due_date:    t.due_date ? t.due_date.slice(0, 16) : "",
    });
    setModal(true);
  }

  async function saveTask() {
    if (!form.title.trim()) { toast("error", "Title is required"); return; }
    setSaving(true);

    const payload = {
      title:       form.title.trim(),
      description: form.description || null,
      status:      form.status,
      priority:    form.priority,
      due_date:    form.due_date ? new Date(form.due_date).toISOString() : null,
    };

    const url    = editingId ? `/api/v1/tasks/${editingId}` : "/api/v1/tasks";
    const method = editingId ? "PUT" : "POST";

    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();

    if (data.success) {
      toast("success", editingId ? "Task updated!" : "Task created!");
      setModal(false);
      loadTasks();
    } else {
      toast("error", data.message || "Something went wrong");
    }
    setSaving(false);
  }

  async function deleteTask(id: number) {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    const res  = await fetch(`/api/v1/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
    const data = await res.json();
    if (data.success) { toast("success", "Task deleted"); loadTasks(); }
    else toast("error", "Failed to delete task");
  }

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  // ── Derived state ─────────────────────────────────────────────

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  // ── Render ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-gray-800 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 border border-brand-500/30">
            <span className="text-base text-brand-400">⬡</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-100">Primetrade</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <button
            onClick={() => setTab("tasks")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
              ${tab === "tasks"
                ? "bg-brand-500/15 text-brand-400"
                : "text-gray-500 hover:bg-gray-800 hover:text-gray-200"
              }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Tasks
          </button>

          {user?.role === "admin" && (
            <button
              onClick={() => setTab("admin")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${tab === "admin"
                  ? "bg-brand-500/15 text-brand-400"
                  : "text-gray-500 hover:bg-gray-800 hover:text-gray-200"
                }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Admin
            </button>
          )}

          <Link
            href="/api-docs"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            API Docs
          </Link>
        </nav>

        {/* User area */}
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-200">{user?.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-600">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="flex-shrink-0 rounded-md p-1 text-gray-600 hover:text-red-400 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">

        {/* ── Tasks Tab ──────────────────────────────────────── */}
        {tab === "tasks" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-4">
              <div>
                <h1 className="text-lg font-bold text-gray-100">My Tasks</h1>
                <p className="text-xs text-gray-500">{tasks.length} total task{tasks.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-brand-500"
                >
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Task
                </button>
              </div>
            </div>

            {/* Kanban board */}
            <div className="flex flex-1 gap-4 overflow-auto p-6">
              {STATUS_COLS.map(({ key, label, dot }) => {
                const colTasks = tasksByStatus(key);
                return (
                  <div key={key} className="flex w-72 flex-shrink-0 flex-col">
                    {/* Column header */}
                    <div className="mb-3 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${dot}`} />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        {label}
                      </span>
                      <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task cards */}
                    <div className="flex flex-col gap-2">
                      {colTasks.map((task) => (
                        <div
                          key={task.id}
                          className="group card cursor-pointer p-4 hover:border-gray-700 transition-colors"
                        >
                          {/* Priority + Actions */}
                          <div className="mb-2 flex items-center justify-between">
                            <span className={`badge ${PRIORITY_STYLES[task.priority]}`}>
                              {task.priority}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(task)}
                                className="rounded p-1 text-gray-600 hover:text-gray-300 transition-colors"
                                title="Edit"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-semibold leading-snug text-gray-100">
                            {task.title}
                          </h3>

                          {/* Description */}
                          {task.description && (
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
                              {task.description}
                            </p>
                          )}

                          {/* Due date */}
                          {task.due_date && (
                            <p className="mt-2.5 flex items-center gap-1 text-xs text-gray-600">
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {fmtDate(task.due_date)}
                            </p>
                          )}
                        </div>
                      ))}

                      {colTasks.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-800 py-8 text-center text-xs text-gray-700">
                          No tasks here
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Admin Tab ───────────────────────────────────────── */}
        {tab === "admin" && (
          <>
            <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-4">
              <div>
                <h1 className="text-lg font-bold text-gray-100">Admin Panel</h1>
                <p className="text-xs text-gray-500">{adminUsers.length} registered users</p>
              </div>
              <span className="badge bg-brand-500/15 text-brand-400">Admin only</span>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="card overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[60px_1fr_1.5fr_100px_120px] gap-4 border-b border-gray-800 bg-gray-800/50 px-5 py-3">
                  {["ID", "Name", "Email", "Role", "Joined"].map((h) => (
                    <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      {h}
                    </span>
                  ))}
                </div>

                {/* Table rows */}
                {adminUsers.map((u) => (
                  <div
                    key={u.id}
                    className="grid grid-cols-[60px_1fr_1.5fr_100px_120px] gap-4 items-center border-b border-gray-800 px-5 py-3.5 hover:bg-gray-800/30 transition-colors last:border-b-0"
                  >
                    <span className="text-xs text-gray-600">#{u.id}</span>
                    <span className="text-sm font-medium text-gray-200">{u.name}</span>
                    <span className="truncate text-xs text-gray-500">{u.email}</span>
                    <span>
                      <span
                        className={`badge ${
                          u.role === "admin"
                            ? "bg-brand-500/15 text-brand-400"
                            : "bg-green-500/15 text-green-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(u.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                ))}

                {adminUsers.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-600">No users found</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Task Modal ─────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setModal(false)}
        >
          <div
            className="card w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-5 text-base font-bold text-gray-100">
              {editingId ? "Edit Task" : "Create New Task"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-base"
                  placeholder="What needs to be done?"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </label>
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  placeholder="Optional details…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </label>
                  <select
                    className="input-base"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Priority
                  </label>
                  <select
                    className="input-base"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  className="input-base"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setModal(false)}>
                Cancel
              </button>
              <button
                className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
                onClick={saveTask}
                disabled={saving || !form.title.trim()}
              >
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast notifications ───────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {t.type === "success" ? (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
