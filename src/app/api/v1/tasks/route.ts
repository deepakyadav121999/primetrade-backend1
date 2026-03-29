/**
 * GET  /api/v1/tasks  — list tasks for the authenticated user
 * POST /api/v1/tasks  — create a new task
 *
 * Both endpoints require a valid Bearer JWT.
 * GET supports optional query params: ?status= and ?priority=
 */
import { NextRequest } from "next/server";
import { withAuth, AuthedRequest } from "@/middleware/auth";
import { query } from "@/lib/db";
import { ok, created, errorResponse, serverError } from "@/lib/response";
import { CreateTaskSchema } from "@/types/schemas";

// ── GET /api/v1/tasks ─────────────────────────────────────────────

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const status   = searchParams.get("status");
    const priority = searchParams.get("priority");

    // Build query dynamically — parameterised to prevent injection
    let sql    = "SELECT * FROM tasks WHERE user_id = ?";
    const params: unknown[] = [req.user.userId];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (priority) {
      sql += " AND priority = ?";
      params.push(priority);
    }

    sql += " ORDER BY created_at DESC";

    const tasks = await query(sql, params);
    return ok(tasks);
  } catch (err) {
    console.error("[GET /tasks]", err);
    return serverError();
  }
}) as (req: NextRequest) => Promise<Response>;

// ── POST /api/v1/tasks ────────────────────────────────────────────

export const POST = withAuth(async (req: AuthedRequest) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return errorResponse("Request body must be valid JSON", 400);

    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { title, description, status, priority, due_date } = parsed.data;

    const result = await query<{ insertId: number }>(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        title,
        description ?? null,
        status,
        priority,
        due_date ? new Date(due_date) : null,
      ]
    );

    // Return the newly created task
    const newTask = await query<unknown[]>(
      "SELECT * FROM tasks WHERE id = ?",
      [result.insertId]
    );

    return created(newTask[0]);
  } catch (err) {
    console.error("[POST /tasks]", err);
    return serverError();
  }
}) as (req: NextRequest) => Promise<Response>;
