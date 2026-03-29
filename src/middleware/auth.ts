import { NextRequest } from "next/server";
import { verifyToken, extractBearer, JWTPayload } from "@/lib/jwt";
import { unauthorized, forbidden } from "@/lib/response";

/** NextRequest extended with authenticated user payload */
export type AuthedRequest = NextRequest & { user: JWTPayload };

/**
 * Higher-order function that wraps a route handler with JWT authentication.
 *
 * Usage:
 *   export const GET = withAuth(async (req) => { ... });            // any logged-in user
 *   export const GET = withAuth(async (req) => { ... }, "admin");   // admin only
 *
 * The authenticated user is available as `req.user`.
 */
export function withAuth(
  handler: (req: AuthedRequest, ctx?: unknown) => Promise<Response>,
  requiredRole?: "admin"
) {
  return async (req: NextRequest, ctx?: unknown): Promise<Response> => {
    // 1. Extract bearer token from Authorization header
    const token = extractBearer(req.headers.get("authorization"));
    if (!token) {
      return unauthorized("Missing Authorization header. Format: Bearer <token>");
    }

    // 2. Verify token signature and expiry
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch {
      return unauthorized("Token is invalid or has expired. Please log in again.");
    }

    // 3. Enforce role-based access if requiredRole is specified
    if (requiredRole && payload.role !== requiredRole) {
      return forbidden(`This endpoint requires the '${requiredRole}' role.`);
    }

    // 4. Attach decoded payload and call the actual handler
    (req as AuthedRequest).user = payload;
    return handler(req as AuthedRequest, ctx);
  };
}
