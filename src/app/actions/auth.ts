"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  dashboardPathFor,
  type Role,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Those details don't match an account." };
  }

  await setSessionCookie({
    id: user.id,
    role: user.role as Role,
    fullName: user.fullName,
  });

  redirect(dashboardPathFor(user.role as Role));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
