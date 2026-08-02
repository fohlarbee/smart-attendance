import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/sessions/:id/end — lecturer ends a running session.
export async function POST(
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

  if (!session.endedAt) {
    await prisma.session.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
