/**
 * GET /api/v1/users/me
 *
 * Returns the profile of the currently authenticated user.
 * Requires a valid Bearer JWT in the Authorization header.
 */
import { NextRequest } from "next/server";
import { withAuth, AuthedRequest } from "@/middleware/auth";
import { query } from "@/lib/db";
import { ok, notFound, serverError } from "@/lib/response";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export const GET = withAuth(async (req: AuthedRequest) => {
  try {
    const users = await query<UserRow[]>(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.userId]
    );

    if (!users[0]) return notFound("User not found");

    return ok(users[0]);
  } catch (err) {
    console.error("[GET /users/me]", err);
    return serverError();
  }
}) as (req: NextRequest) => Promise<Response>;
