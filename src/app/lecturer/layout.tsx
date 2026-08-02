import { requireRole } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export default async function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("LECTURER");
  return <AppShell user={user}>{children}</AppShell>;
}
