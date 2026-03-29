/**
 * GET /api/v1/admin/users
 *
 * Returns a list of all registered users.
 * ADMIN ONLY — returns 403 for regular users.
 */
import { NextRequest } from "next/server";
import { withAuth, AuthedRequest } from "@/middleware/auth";
import { query } from "@/lib/db";
import { ok, serverError } from "@/lib/response";

export const GET = withAuth(async (_req: AuthedRequest) => {
  try {
    const users = await query(
      `SELECT id, name, email, role, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return ok(users);
  } catch (err) {
    console.error("[GET /admin/users]", err);
    return serverError();
  }
}, "admin") as (req: NextRequest) => Promise<Response>;
