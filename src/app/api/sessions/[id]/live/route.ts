import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/sessions/:id/live — who has scanned in (SPEC.md §9).
// Identity comes from the joined student profile, never typed at scan time.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "LECTURER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { id } = await params;
  const session = await prisma.session.findFirst({
    where: { id, course: { lecturerId: user.id } },
    select: { id: true, endedAt: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const rows = await prisma.attendance.findMany({
    where: { sessionId: session.id },
    orderBy: { markedAt: "desc" },
    select: {
      markedAt: true,
      student: { select: { fullName: true, matricNumber: true } },
    },
  });

  return NextResponse.json(
    {
      count: rows.length,
      ended: Boolean(session.endedAt),
      present: rows.map((r) => ({
        fullName: r.student.fullName,
        matricNumber: r.student.matricNumber,
        markedAt: r.markedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
