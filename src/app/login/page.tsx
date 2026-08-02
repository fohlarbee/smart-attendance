import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, dashboardPathFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(dashboardPathFor(user.role));

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <span className="grid h-6 w-6 place-items-center rounded-md bg-amber text-ink font-display font-bold">
            B
          </span>
          Beacon
        </Link>

        <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
        <p className="mt-1 mb-8 text-sm text-muted">
          Sign in to mark or manage attendance.
        </p>

        <LoginForm />

        <p className="mt-8 text-center text-xs text-faint">
          Demo · lecturer@beacon.edu / password123
        </p>
      </div>
    </main>
  );
}
