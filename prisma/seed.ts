import { PrismaClient, Role, Section, Gender } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Mathal International Schools database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const teacherPassword = await bcrypt.hash("teacher123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  // 1. Users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mathal.edu.ng" },
    update: {},
    create: {
      email: "admin@mathal.edu.ng",
      name: "Alhaji Ibrahim Danladi (Director)",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      phone: "+234 803 123 4567",
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher.musa@mathal.edu.ng" },
    update: {},
    create: {
      email: "teacher.musa@mathal.edu.ng",
      name: "Mr. Musa Abdullahi",
      passwordHash: teacherPassword,
      role: Role.TEACHER,
      phone: "+234 802 987 6543",
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student.zainab@mathal.edu.ng" },
    update: {},
    create: {
      email: "student.zainab@mathal.edu.ng",
      name: "Zainab Al-Mansoor",
      passwordHash: studentPassword,
      role: Role.STUDENT,
      phone: "+234 803 444 8899",
    },
  });

  // 2. Teacher Profile
  await prisma.teacher.upsert({
    where: { staffId: "MIS/STF/001" },
    update: {},
    create: {
      userId: teacherUser.id,
      staffId: "MIS/STF/001",
      title: "Mr.",
      qualification: "B.Sc (Ed) Mathematics",
      assignedSection: Section.BOTH,
      assignedClasses: "Basic 4,JSS 2",
      assignedSubjects: "Mathematics,Basic Science",
    },
  });

  // 3. Subjects
  const subjects = [
    { name: "Mathematics", code: "MTH", section: Section.BOTH },
    { name: "English Language", code: "ENG", section: Section.BOTH },
    { name: "Basic Science & Technology", code: "BST", section: Section.PRIMARY },
    { name: "Social Studies & Civic Education", code: "SSC", section: Section.BOTH },
    { name: "Agricultural Science", code: "AGR", section: Section.BOTH },
    { name: "ICT / Computer Studies", code: "ICT", section: Section.BOTH },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  // 4. Student Profiles
  const zainab = await prisma.student.upsert({
    where: { admissionNo: "MIS/PRI/2024/042" },
    update: {},
    create: {
      userId: studentUser.id,
      admissionNo: "MIS/PRI/2024/042",
      firstName: "Zainab",
      lastName: "Al-Mansoor",
      otherName: "Khadija",
      section: Section.PRIMARY,
      classLevel: "Basic 4",
      arm: "Gold",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("2015-05-14"),
      bloodGroup: "O+",
      guardianName: "Dr. Mansoor Al-Mansoor",
      guardianPhone: "+234 803 444 8899",
      guardianEmail: "dr.mansoor@gmail.com",
      guardianAddress: "12 Crescent Avenue, GRA Extension",
    },
  });

  console.log("✅ Mathal International Schools seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
