import { NextResponse } from "next/server";

// ── Success responses ─────────────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

// ── Error responses ───────────────────────────────────────────────

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string[]>
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(errors ? { errors } : {}),
    },
    { status }
  );
}

export const unauthorized = (msg = "Unauthorized — valid Bearer token required") =>
  errorResponse(msg, 401);

export const forbidden = (msg = "Forbidden — insufficient role") =>
  errorResponse(msg, 403);

export const notFound = (msg = "Resource not found") =>
  errorResponse(msg, 404);

export const serverError = (msg = "Internal server error") =>
  errorResponse(msg, 500);
