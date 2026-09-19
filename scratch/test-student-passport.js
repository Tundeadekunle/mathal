const { PrismaClient } = require("@prisma/client");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { Pool } = require("@neondatabase/serverless");
require("dotenv").config();

async function run() {
  console.log("=== Testing Student Passport Storage & Retrieval in Neon DB ===");
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch an existing student
    const student = await prisma.student.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!student) {
      console.log("No student found in DB to test.");
      return;
    }

    console.log(`Found student: ${student.firstName} ${student.lastName} (${student.admissionNo}), ID: ${student.id}`);

    // Sample small 1x1 transparent/colored JPEG base64
    const samplePassportBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

    // 2. Test updating passportPhoto
    console.log("Updating passportPhoto on student...");
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { passportPhoto: samplePassportBase64 },
    });

    console.log("Student updated successfully! passportPhoto length:", updated.passportPhoto ? updated.passportPhoto.length : 0);

    // 3. Verify retrieval
    const refetched = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        id: true,
        admissionNo: true,
        firstName: true,
        lastName: true,
        passportPhoto: true,
      },
    });

    if (refetched && refetched.passportPhoto === samplePassportBase64) {
      console.log("PASS: Passport photograph verified persisted and retrieved intact from Neon DB!");
    } else {
      console.error("FAIL: Passport photograph does not match expected base64.");
    }

  } catch (err) {
    console.error("Error during passport test:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run();
