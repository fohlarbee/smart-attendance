import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CAMPAIGN } from "@/lib/constants";

// POST /api/sessions — lecturer starts a session (SPEC.md §3a, §9).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "LECTURER") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { courseId, centreLat, centreLng, centreAccuracy, radiusMetres, label, address } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof courseId !== "string" ||
    typeof centreLat !== "number" ||
    typeof centreLng !== "number" ||
    !Number.isFinite(centreLat) ||
    !Number.isFinite(centreLng)
  ) {
    return NextResponse.json(
      { error: "A course and a captured location are required." },
      { status: 400 },
    );
  }

  const radius = Math.round(Number(radiusMetres));
  const safeRadius = Number.isFinite(radius)
    ? Math.min(CAMPAIGN.MAX_RADIUS_M, Math.max(CAMPAIGN.MIN_RADIUS_M, radius))
    : CAMPAIGN.DEFAULT_RADIUS_M;

  // The course must belong to this lecturer.
  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: user.id },
    select: { id: true },
  });
  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  const session = await prisma.session.create({
    data: {
      courseId: course.id,
      centreLat,
      centreLng,
      centreAccuracy:
        typeof centreAccuracy === "number" && Number.isFinite(centreAccuracy)
          ? centreAccuracy
          : null,
      radiusMetres: safeRadius,
      label: typeof label === "string" && label.trim() ? label.trim() : null,
    },
    select: { id: true },
  });

  console.log(
    `[session:create] id=${session.id} course=${course.id} lecturer=${user.id} ` +
      `center=(${centreLat},${centreLng}) radius=${safeRadius}m` +
      (typeof address === "string" && address ? ` address="${address}"` : ""),
  );

  return NextResponse.json({ id: session.id }, { status: 201 });
}
