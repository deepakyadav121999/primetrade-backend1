/**
 * GET /api/v1/admin/tasks
 *
 * Returns ALL tasks across all users with user info joined.
 * ADMIN ONLY — returns 403 for regular users.
 */
import { NextRequest } from "next/server";
import { withAuth, AuthedRequest } from "@/middleware/auth";
import { query } from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export const GET = withAuth(async (_req: AuthedRequest) => {
  try {
    const tasks = await query(
      `SELECT
         t.id,
         t.title,
         t.description,
         t.status,
         t.priority,
         t.due_date,
         t.created_at,
         t.updated_at,
         u.id   AS user_id,
         u.name AS user_name,
         u.email AS user_email
       FROM tasks t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    return ok(tasks);
  } catch (err) {
    console.error("[GET /admin/tasks]", err);
    return serverError();
  }
}, "admin") as (req: NextRequest) => Promise<Response>;
