import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function StudentHome() {
  const user = await requireRole("STUDENT");
  const recent = await prisma.attendance.findMany({
    where: { studentId: user.id },
    include: { session: { include: { course: true } } },
    orderBy: { markedAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          Hi, {user.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Scan your lecturer&apos;s beacon to mark attendance.
        </p>
      </div>

      <Link href="/student/scan" className="block">
        <Card className="glow-amber flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <CardTitle>Scan to mark attendance</CardTitle>
            <CardDescription className="mt-1">
              Point your camera at the code on the screen.
            </CardDescription>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber text-2xl text-ink">
            ⤢
          </span>
        </Card>
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Recent
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-faint">No attendance recorded yet.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium">{a.session.course.title}</p>
                  <p className="font-mono text-xs text-muted">
                    {a.session.course.code}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {a.markedAt.toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
