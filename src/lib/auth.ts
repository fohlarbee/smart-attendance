import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

// Roles (SQLite has no enums; we validate here). See SPEC.md §2.
export const ROLES = ["ADMIN", "LECTURER", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

export const SESSION_COOKIE = "beacon_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  role: Role;
  fullName: string;
};

function key(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

// --- passwords ---
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- session token (JWT) ---
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ role: user.role, fullName: user.fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub || typeof payload.role !== "string") return null;
    if (!ROLES.includes(payload.role as Role)) return null;
    return {
      id: payload.sub,
      role: payload.role as Role,
      fullName: typeof payload.fullName === "string" ? payload.fullName : "",
    };
  } catch {
    return null;
  }
}

// --- cookie helpers (server actions / route handlers) ---
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signSession(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Current user from the session cookie, or null. Use in server components/routes. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const dashboardPathFor = (role: Role): string =>
  role === "ADMIN"
    ? "/admin"
    : role === "LECTURER"
      ? "/lecturer"
      : "/student";
