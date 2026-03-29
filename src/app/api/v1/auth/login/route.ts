/**
 * POST /api/v1/auth/login
 *
 * Authenticate a user and return a JWT.
 * - Validates input with Zod
 * - Uses constant-time bcrypt comparison to prevent timing attacks
 *   (the dummy hash comparison runs even if the user doesn't exist,
 *    so an attacker can't detect valid emails by response time)
 * - Returns user object + signed JWT on success
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { ok, errorResponse, serverError } from "@/lib/response";
import { LoginSchema } from "@/types/schemas";

// Pre-computed dummy hash — used when email is not found to keep
// response time constant regardless of whether the user exists.
const DUMMY_HASH =
  "$2a$12$invaliddummyhashusedfortimingprotectionxxxxxxxxxxxxxx";

type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "user" | "admin";
};

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate
    const body = await req.json().catch(() => null);
    if (!body) return errorResponse("Request body must be valid JSON", 400);

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { email, password } = parsed.data;

    // 2. Fetch user (select only needed columns, never SELECT *)
    const users = await query<UserRow[]>(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = users[0] ?? null;

    // 3. Constant-time password comparison (prevents user-enumeration via timing)
    const hashToCheck = user ? user.password_hash : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCheck);

    // 4. Reject if user doesn't exist OR password is wrong (same generic error)
    if (!user || !isValid) {
      return errorResponse("Invalid email or password", 401);
    }

    // 5. Issue JWT
    const token = signToken({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });

    return ok({
      user:  { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      message: "Login successful",
    });
  } catch (err) {
    console.error("[POST /auth/login]", err);
    return serverError();
  }
}
