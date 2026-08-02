import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default async function AdminHome() {
  await requireRole("ADMIN");

  const [students, courses, sessions, marks] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.course.count(),
    prisma.session.count(),
    prisma.attendance.count(),
  ]);

  const stats = [
    { label: "Students", value: students },
    { label: "Courses", value: courses },
    { label: "Sessions", value: sessions },
    { label: "Marks recorded", value: marks },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted">System-wide attendance at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="font-display text-3xl font-semibold text-fg">
              {s.value}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <Link href="/admin/records" className="block">
        <Card className="flex items-center justify-between transition-transform hover:-translate-y-0.5">
          <div>
            <CardTitle>Attendance records</CardTitle>
            <CardDescription className="mt-1">
              Filter by course and export to CSV.
            </CardDescription>
          </div>
          <span className="text-muted">→</span>
        </Card>
      </Link>
    </div>
  );
}
