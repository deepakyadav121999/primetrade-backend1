import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

if (!SECRET || SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET must be set and at least 32 characters long. Check your .env file."
  );
}

export interface JWTPayload {
  userId: number;
  email:  string;
  role:   "user" | "admin";
  iat?:   number;
  exp?:   number;
}

/** Sign a JWT token for the given payload */
export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "7d",
  });
}

/** Verify and decode a JWT token. Throws if invalid or expired. */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}

/** Extract Bearer token string from an Authorization header value */
export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}
