import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SessionSummary({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("LECTURER");
  const { id } = await params;

  const session = await prisma.session.findFirst({
    where: { id, course: { lecturerId: user.id } },
    select: {
      id: true,
      label: true,
      startedAt: true,
      endedAt: true,
      course: {
        select: {
          code: true,
          title: true,
          _count: { select: { enrolments: true } },
        },
      },
      attendances: {
        orderBy: { markedAt: "asc" },
        select: {
          markedAt: true,
          student: { select: { fullName: true, matricNumber: true } },
        },
      },
    },
  });
  if (!session) notFound();

  const present = session.attendances.length;
  const enrolled = session.course._count.enrolments;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/lecturer"
          className="mb-6 inline-block text-sm text-muted transition-colors hover:text-fg"
        >
          ← Courses
        </Link>
        <p className="font-mono text-xs uppercase tracking-wide text-amber">
          {session.course.code} · session ended
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold">
          {session.label ?? session.course.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {session.startedAt.toLocaleString()}
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-2xl border border-hairline bg-surface p-5">
          <p className="font-display text-3xl font-semibold text-amber">
            {present}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">
            Present
          </p>
        </div>
        <div className="flex-1 rounded-2xl border border-hairline bg-surface p-5">
          <p className="font-display text-3xl font-semibold text-fg">
            {enrolled - present}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">
            Absent
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/lecturer/sessions/${session.id}/export?scope=present`}
          className="inline-flex h-10 items-center rounded-lg bg-amber px-4 text-sm font-semibold text-ink transition-colors hover:bg-amber-soft"
        >
          Export present (CSV)
        </a>
        <a
          href={`/api/lecturer/sessions/${session.id}/export?scope=roster`}
          className="inline-flex h-10 items-center rounded-lg border border-hairline px-4 text-sm text-fg transition-colors hover:border-amber/60"
        >
          Export full roster (CSV)
        </a>
      </div>

      {present > 0 && (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline">
          {session.attendances.map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-5 py-3.5"
            >
              <div>
                <p className="text-sm font-medium">{a.student.fullName}</p>
                <p className="font-mono text-xs text-muted">
                  {a.student.matricNumber ?? "—"}
                </p>
              </div>
              <time className="text-xs text-faint">
                {a.markedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
