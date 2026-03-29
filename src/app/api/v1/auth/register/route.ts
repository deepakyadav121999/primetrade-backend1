/**
 * POST /api/v1/auth/register
 *
 * Register a new user account.
 * - Validates input with Zod
 * - Checks for duplicate email
 * - Hashes password with bcrypt (12 salt rounds)
 * - Returns user object + signed JWT
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { created, errorResponse, serverError } from "@/lib/response";
import { RegisterSchema } from "@/types/schemas";

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & validate request body
    const body = await req.json().catch(() => null);
    if (!body) return errorResponse("Request body must be valid JSON", 400);

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { name, email, password, role } = parsed.data;

    // 2. Check if email is already registered
    const existing = await query<{ id: number }[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existing.length > 0) {
      return errorResponse("An account with this email already exists", 409);
    }

    // 3. Hash password (bcrypt, 12 salt rounds — intentionally slow)
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Insert user into database
    const result = await query<{ insertId: number }>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, role]
    );

    const userId = result.insertId;

    // 5. Issue JWT token
    const token = signToken({ userId, email, role });

    // 6. Return user (no password) + token
    return created({
      user:  { id: userId, name, email, role },
      token,
      message: "Account created successfully",
    });
  } catch (err) {
    console.error("[POST /auth/register]", err);
    return serverError();
  }
}
