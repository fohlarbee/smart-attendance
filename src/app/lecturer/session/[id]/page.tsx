import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BeaconDisplay } from "@/components/beacon/beacon-display";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("LECTURER");
  const { id } = await params;

  const session = await prisma.session.findFirst({
    where: { id, course: { lecturerId: user.id } },
    select: {
      id: true,
      label: true,
      endedAt: true,
      radiusMetres: true,
      course: { select: { code: true, title: true } },
    },
  });
  if (!session) notFound();
  if (session.endedAt) redirect(`/lecturer/session/${id}/summary`);

  return (
    <BeaconDisplay
      sessionId={session.id}
      courseCode={session.course.code}
      courseTitle={session.course.title}
      label={session.label}
      radiusMetres={session.radiusMetres}
    />
  );
}
