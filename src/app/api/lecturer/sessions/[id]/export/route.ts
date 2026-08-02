import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/lecturer/sessions/:id/export?scope=present|roster
// Lecturer-scoped CSV export for one of their own sessions.
//   present → only students who scanned in
//   roster  → every enrolled student, marked Present/Absent
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "LECTURER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const scope = new URL(req.url).searchParams.get("scope") === "roster"
    ? "roster"
    : "present";

  const session = await prisma.session.findFirst({
    where: { id, course: { lecturerId: user.id } },
    select: {
      id: true,
      label: true,
      startedAt: true,
      courseId: true,
      course: { select: { code: true, title: true } },
    },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const esc = (v: string) => `"${String(v).replaceAll('"', '""')}"`;
  const date = session.startedAt.toISOString().slice(0, 10);
  const toCsv = (header: string[], rows: string[][]) =>
    [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");

  let header: string[];
  let rows: string[][];
  let filename: string;

  if (scope === "present") {
    const marks = await prisma.attendance.findMany({
      where: { sessionId: session.id },
      orderBy: { markedAt: "asc" },
      select: {
        markedAt: true,
        student: { select: { fullName: true, matricNumber: true } },
      },
    });
    header = ["Student", "Matric number", "Marked at"];
    rows = marks.map((m) => [
      m.student.fullName,
      m.student.matricNumber ?? "",
      m.markedAt.toISOString(),
    ]);
    filename = `present-${session.course.code}-${date}.csv`;
  } else {
    const [enrolments, marks] = await Promise.all([
      prisma.enrolment.findMany({
        where: { courseId: session.courseId },
        select: {
          student: {
            select: { id: true, fullName: true, matricNumber: true },
          },
        },
      }),
      prisma.attendance.findMany({
        where: { sessionId: session.id },
        select: { studentId: true, markedAt: true },
      }),
    ]);
    const markedAtByStudent = new Map(
      marks.map((m) => [m.studentId, m.markedAt]),
    );
    const sorted = enrolments
      .map((e) => e.student)
      .sort((a, b) =>
        (a.matricNumber ?? "").localeCompare(b.matricNumber ?? ""),
      );

    header = ["Student", "Matric number", "Status", "Marked at"];
    rows = sorted.map((s) => {
      const at = markedAtByStudent.get(s.id);
      return [
        s.fullName,
        s.matricNumber ?? "",
        at ? "Present" : "Absent",
        at ? at.toISOString() : "",
      ];
    });
    filename = `roster-${session.course.code}-${date}.csv`;
  }

  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
