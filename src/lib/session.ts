import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, dashboardPathFor, type Role, type SessionUser } from "@/lib/auth";

/** Require any signed-in user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific role; send others to their own dashboard (or login). */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(dashboardPathFor(user.role));
  return user;
}
