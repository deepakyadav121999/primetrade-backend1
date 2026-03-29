/**
 * GET    /api/v1/tasks/:id  — get a single task
 * PUT    /api/v1/tasks/:id  — update a task (partial update supported)
 * DELETE /api/v1/tasks/:id  — delete a task
 *
 * Ownership rules:
 *   - Regular users can only access/modify their OWN tasks
 *   - Admins can access/modify ANY task
 */
import { NextRequest } from "next/server";
import { withAuth, AuthedRequest } from "@/middleware/auth";
import { query } from "@/lib/db";
import { ok, errorResponse, notFound, forbidden, serverError } from "@/lib/response";
import { UpdateTaskSchema } from "@/types/schemas";

type RouteContext = { params: { id: string } };

type TaskRow = {
  id: number;
  user_id: number;
  [key: string]: unknown;
};

/** Fetch task by ID and enforce ownership (unless admin) */
async function resolveTask(taskId: number, userId: number, role: string) {
  const rows = await query<TaskRow[]>(
    "SELECT * FROM tasks WHERE id = ? LIMIT 1",
    [taskId]
  );
  const task = rows[0];
  if (!task) return { task: null, err: notFound("Task not found") };
  if (role !== "admin" && task.user_id !== userId) {
    return { task: null, err: forbidden("You do not have access to this task") };
  }
  return { task, err: null };
}

// ── GET /api/v1/tasks/:id ─────────────────────────────────────────

export const GET = withAuth(async (req: AuthedRequest, ctx: RouteContext) => {
  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return errorResponse("Task ID must be a positive integer", 400);
    }
    const { task, err } = await resolveTask(id, req.user.userId, req.user.role);
    if (err) return err;
    return ok(task);
  } catch (e) {
    console.error("[GET /tasks/:id]", e);
    return serverError();
  }
}, undefined) as unknown as (req: NextRequest, ctx: RouteContext) => Promise<Response>;

// ── PUT /api/v1/tasks/:id ─────────────────────────────────────────

export const PUT = withAuth(async (req: AuthedRequest, ctx: RouteContext) => {
  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return errorResponse("Task ID must be a positive integer", 400);
    }

    const { task, err } = await resolveTask(id, req.user.userId, req.user.role);
    if (err) return err;

    const body = await req.json().catch(() => null);
    if (!body) return errorResponse("Request body must be valid JSON", 400);

    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse("No fields provided to update", 400);
    }

    const { title, description, status, priority, due_date } = parsed.data;

    // Only update provided fields (COALESCE keeps existing value if NULL passed)
    await query(
      `UPDATE tasks
       SET
         title       = COALESCE(?, title),
         description = COALESCE(?, description),
         status      = COALESCE(?, status),
         priority    = COALESCE(?, priority),
         due_date    = COALESCE(?, due_date),
         updated_at  = NOW()
       WHERE id = ?`,
      [
        title       ?? null,
        description ?? null,
        status      ?? null,
        priority    ?? null,
        due_date ? new Date(due_date) : null,
        task!.id,
      ]
    );

    const updated = await query<unknown[]>(
      "SELECT * FROM tasks WHERE id = ?",
      [id]
    );
    return ok(updated[0]);
  } catch (e) {
    console.error("[PUT /tasks/:id]", e);
    return serverError();
  }
}, undefined) as unknown as (req: NextRequest, ctx: RouteContext) => Promise<Response>;

// ── DELETE /api/v1/tasks/:id ──────────────────────────────────────

export const DELETE = withAuth(async (req: AuthedRequest, ctx: RouteContext) => {
  try {
    const id = Number(ctx.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return errorResponse("Task ID must be a positive integer", 400);
    }
    const { task, err } = await resolveTask(id, req.user.userId, req.user.role);
    if (err) return err;

    await query("DELETE FROM tasks WHERE id = ?", [task!.id]);
    return ok({ id: task!.id, message: "Task deleted successfully" });
  } catch (e) {
    console.error("[DELETE /tasks/:id]", e);
    return serverError();
  }
}, undefined) as unknown as (req: NextRequest, ctx: RouteContext) => Promise<Response>;
