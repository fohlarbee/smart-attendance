import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateSessionForm } from "./create-session-form";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireRole("LECTURER");
  const { courseId } = await searchParams;
  if (!courseId) notFound();

  const course = await prisma.course.findFirst({
    where: { id: courseId, lecturerId: user.id },
    select: { id: true, code: true, title: true },
  });
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/lecturer"
        className="mb-6 inline-block text-sm text-muted transition-colors hover:text-fg"
      >
        ← Courses
      </Link>
      <CreateSessionForm
        courseId={course.id}
        courseCode={course.code}
        courseTitle={course.title}
      />
    </div>
  );
}
