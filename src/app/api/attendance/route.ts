import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { verifyToken } from "@/lib/token";
import { haversineMetres } from "@/lib/geo";

// POST /api/attendance — student marks attendance by scanning the beacon.
// Validation order mirrors SPEC.md §3 step 5.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const deviceHash =
    typeof body.deviceHash === "string" ? body.deviceHash : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;

  // 1. Token authenticity + freshness.
  const check = verifyToken(token);
  if (!check.ok) {
    const message =
      check.reason === "expired"
        ? "This code has expired. Scan the current one on screen."
        : "That code isn't valid. Scan the code on the lecturer's screen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 2. Session must exist and still be running.
  const session = await prisma.session.findUnique({
    where: { id: check.sessionId },
    select: {
      id: true,
      endedAt: true,
      centreLat: true,
      centreLng: true,
      radiusMetres: true,
      courseId: true,
      course: { select: { title: true } },
    },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.endedAt) {
    return NextResponse.json(
      { error: "This session has ended." },
      { status: 410 },
    );
  }

  // 3. Student must be enrolled in the course.
  const enrolled = await prisma.enrolment.findUnique({
    where: {
      courseId_studentId: { courseId: session.courseId, studentId: user.id },
    },
    select: { id: true },
  });
  if (!enrolled) {
    return NextResponse.json(
      { error: "You're not enrolled in this course." },
      { status: 403 },
    );
  }

  // 4. Geofence — must have a location and be inside it (SPEC.md §6).
  if (lat === null || lng === null) {
    console.warn(
      `[attendance] student=${user.id} session=${session.id} REJECT=no-location`,
    );
    return NextResponse.json(
      { error: "Location is required. Allow location access and try again." },
      { status: 400 },
    );
  }

  const distance = haversineMetres(
    session.centreLat,
    session.centreLng,
    lat,
    lng,
  );
  const inside = distance <= session.radiusMetres;

  // Location diagnostics — visible in the server/Vercel logs.
  console.log(
    `[attendance] student=${user.id} (${user.fullName}) session=${session.id} ` +
      `center=(${session.centreLat},${session.centreLng}) ` +
      `studentLoc=(${lat},${lng}) ` +
      `distance=${Math.round(distance)}m radius=${session.radiusMetres}m inside=${inside}`,
  );

  if (!inside) {
    return NextResponse.json(
      {
        error: `You're ${Math.round(distance)}m from the classroom (limit ${session.radiusMetres}m). Move closer and try again.`,
      },
      { status: 403 },
    );
  }

  // 5. Record the mark. Unique constraints enforce one-per-student and,
  //    when enabled, one-per-device (SPEC.md §5, §7).
  try {
    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId: user.id,
        lat,
        lng,
        deviceHash,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? "");
      if (target.includes("deviceHash")) {
        return NextResponse.json(
          {
            error:
              "This device has already marked attendance for this session.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { alreadyMarked: true, course: session.course.title },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "Couldn't record attendance. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, course: session.course.title });
}
