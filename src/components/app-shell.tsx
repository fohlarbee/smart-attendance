import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { Role, SessionUser } from "@/lib/auth";

const roleLabel: Record<Role, string> = {
  ADMIN: "Admin",
  LECTURER: "Lecturer",
  STUDENT: "Student",
};

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-amber font-display font-bold text-ink">
              B
            </span>
            <span className="font-display font-semibold">Beacon</span>
            <span className="ml-1 rounded-full border border-hairline px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted">
              {roleLabel[user.role]}
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">
              {user.fullName}
            </span>
            <form action={logoutAction}>
              <button className="text-sm text-muted transition-colors hover:text-fg">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
