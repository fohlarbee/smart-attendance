import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { issueToken, TOKEN_TTL_SECONDS } from "@/lib/token";

// GET /api/sessions/:id/token — current rotating QR token for the beacon (SPEC.md §5, §9).
// Lecturer-only; the session must belong to them and still be running.
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
  if (session.endedAt) {
    return NextResponse.json({ error: "Session ended" }, { status: 410 });
  }

  return NextResponse.json(
    { token: issueToken(session.id), ttl: TOKEN_TTL_SECONDS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
