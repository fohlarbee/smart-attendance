import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function LecturerHome() {
  const user = await requireRole("LECTURER");
  const courses = await prisma.course.findMany({
    where: { lecturerId: user.id },
    include: { _count: { select: { enrolments: true } } },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Your courses</h1>
        <p className="mt-1 text-sm text-muted">
          Start a session to display the attendance beacon.
        </p>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardTitle>No courses yet</CardTitle>
          <CardDescription>
            Ask an admin to assign a course to you.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between gap-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-wide text-amber">
                  {c.code}
                </p>
                <CardTitle className="mt-1">{c.title}</CardTitle>
                <CardDescription className="mt-1">
                  {c._count.enrolments} students enrolled
                </CardDescription>
              </div>
              <Link
                href={`/lecturer/new?courseId=${c.id}`}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-amber px-5 text-sm font-semibold text-ink transition-colors hover:bg-amber-soft"
              >
                Start session
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
