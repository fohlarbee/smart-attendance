import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/admin/attendance?courseId=&format=csv — admin records + CSV export (SPEC.md §9).
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId") ?? undefined;
  const format = url.searchParams.get("format");

  const rows = await prisma.attendance.findMany({
    where: courseId ? { session: { courseId } } : undefined,
    orderBy: { markedAt: "desc" },
    select: {
      markedAt: true,
      student: { select: { fullName: true, matricNumber: true } },
      session: {
        select: {
          label: true,
          startedAt: true,
          course: { select: { code: true, title: true } },
        },
      },
    },
  });

  if (format === "csv") {
    const header = [
      "Course code",
      "Course title",
      "Session date",
      "Session label",
      "Student",
      "Matric number",
      "Marked at",
    ];
    const esc = (v: string) => `"${v.replaceAll('"', '""')}"`;
    const lines = rows.map((r) =>
      [
        r.session.course.code,
        r.session.course.title,
        r.session.startedAt.toISOString().slice(0, 10),
        r.session.label ?? "",
        r.student.fullName,
        r.student.matricNumber ?? "",
        r.markedAt.toISOString(),
      ]
        .map((c) => esc(String(c)))
        .join(","),
    );
    const csv = [header.map(esc).join(","), ...lines].join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance${courseId ? `-${courseId}` : ""}.csv"`,
      },
    });
  }

  return NextResponse.json({ count: rows.length, rows });
}
