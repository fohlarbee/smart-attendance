import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "password123"; // demo only

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@beacon.edu" },
    update: {},
    create: {
      fullName: "Ada Admin",
      email: "admin@beacon.edu",
      passwordHash,
      role: "ADMIN",
    },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: "lecturer@beacon.edu" },
    update: {},
    create: {
      fullName: "Dr. Ibrahim Bello",
      email: "lecturer@beacon.edu",
      passwordHash,
      role: "LECTURER",
    },
  });

  const course = await prisma.course.upsert({
    where: { code: "CSC305" },
    update: {},
    create: {
      code: "CSC305",
      title: "Operating Systems",
      lecturerId: lecturer.id,
    },
  });

  const students = [
    { fullName: "Japhet Salihu Ndace", matricNumber: "UJ/2022/NS/0469" },
    { fullName: "Grace Okon", matricNumber: "UJ/2022/NS/0470" },
    { fullName: "Musa Danladi", matricNumber: "UJ/2022/NS/0471" },
    { fullName: "Blessing Eze", matricNumber: "UJ/2022/NS/0472" },
    { fullName: "Tunde Balogun", matricNumber: "UJ/2022/NS/0473" },
  ];

  const enrolledStudents: { id: string }[] = [];
  for (const s of students) {
    // University email = matric without the "UJ/" prefix or slashes, lowercased.
    // e.g. UJ/2022/NS/0469 -> 2022ns0469@unijos.edu.ng
    const email = `${s.matricNumber.replace(/^UJ\//i, "").replaceAll("/", "").toLowerCase()}@unijos.edu.ng`;
    const student = await prisma.user.upsert({
      where: { matricNumber: s.matricNumber },
      update: {},
      create: {
        fullName: s.fullName,
        email,
        passwordHash,
        role: "STUDENT",
        matricNumber: s.matricNumber,
      },
    });
    await prisma.enrolment.upsert({
      where: { courseId_studentId: { courseId: course.id, studentId: student.id } },
      update: {},
      create: { courseId: course.id, studentId: student.id },
    });
    enrolledStudents.push(student);
  }

  // A finished demo session so records + exports have realistic data out of the
  // box. Fixed id keeps this idempotent — reseeding won't pile up duplicates.
  const DEMO_SESSION_ID = "demo-session-csc305";
  const startedAt = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
  const endedAt = new Date(Date.now() - 30 * 60 * 1000);
  const demoSession = await prisma.session.upsert({
    where: { id: DEMO_SESSION_ID },
    update: {},
    create: {
      id: DEMO_SESSION_ID,
      courseId: course.id,
      label: "Week 5 lecture",
      startedAt,
      endedAt,
      centreLat: 9.05,
      centreLng: 7.49,
      radiusMetres: 50,
    },
  });

  // First 3 of the 5 present → the roster export shows both Present and Absent.
  for (const st of enrolledStudents.slice(0, 3)) {
    await prisma.attendance.upsert({
      where: {
        sessionId_studentId: { sessionId: demoSession.id, studentId: st.id },
      },
      update: {},
      create: {
        sessionId: demoSession.id,
        studentId: st.id,
        lat: 9.05,
        lng: 7.49,
      },
    });
  }

  console.log("Seeded:");
  console.log(`  admin    → admin@beacon.edu / ${PASSWORD}`);
  console.log(`  lecturer → lecturer@beacon.edu / ${PASSWORD}`);
  console.log(`  student  → 2022ns0469@unijos.edu.ng / ${PASSWORD} (+ 4 more)`);
  console.log(`  course   → CSC305 (Operating Systems) with 5 students enrolled`);
  console.log(`  session  → "Week 5 lecture" (ended) with 3 of 5 present`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
