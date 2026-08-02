import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

export default async function AdminRecords({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  await requireRole("ADMIN");
  const { courseId } = await searchParams;

  const [courses, rows] = await Promise.all([
    prisma.course.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
    prisma.attendance.findMany({
      where: courseId ? { session: { courseId } } : undefined,
      orderBy: { markedAt: "desc" },
      take: 200,
      select: {
        id: true,
        markedAt: true,
        student: { select: { fullName: true, matricNumber: true } },
        session: {
          select: {
            label: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
    }),
  ]);

  const exportHref = `/api/admin/attendance?format=csv${courseId ? `&courseId=${courseId}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-block text-sm text-muted transition-colors hover:text-fg"
          >
            ← Overview
          </Link>
          <h1 className="font-display text-2xl font-semibold">
            Attendance records
          </h1>
        </div>
        <a
          href={exportHref}
          className="inline-flex h-10 items-center rounded-lg bg-amber px-4 text-sm font-semibold text-ink transition-colors hover:bg-amber-soft"
        >
          Export CSV
        </a>
      </div>

      {/* Course filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/admin/records" active={!courseId} label="All courses" />
        {courses.map((c) => (
          <FilterChip
            key={c.id}
            href={`/admin/records?courseId=${c.id}`}
            active={courseId === c.id}
            label={c.code}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-faint">No records yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hairline">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Matric no.</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Marked at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">{r.student.fullName}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted">
                    {r.student.matricNumber ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-amber">
                      {r.session.course.code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {r.markedAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 font-mono text-xs transition-colors",
        active
          ? "border-amber bg-amber/10 text-amber"
          : "border-hairline text-muted hover:text-fg",
      )}
    >
      {label}
    </Link>
  );
}
