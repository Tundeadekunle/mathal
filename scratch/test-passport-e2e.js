// End-to-end verification of pupil/student passport photo upload, update, and retrieval across all routes

async function run() {
  console.log("=== STARTING STUDENT PASSPORT END-TO-END VERIFICATION ===");
  const baseUrl = "http://localhost:3000";

  // 1. Fetch existing student
  console.log("\n1. Fetching students from Neon DB...");
  const listRes = await fetch(`${baseUrl}/api/students`);
  const listData = await listRes.json();
  if (!listData.students || listData.students.length === 0) {
    throw new Error("No students found in Neon DB to test.");
  }

  const targetStudent = listData.students[0];
  console.log(`Target student: ${targetStudent.firstName} ${targetStudent.lastName} (${targetStudent.admissionNo}), ID: ${targetStudent.id}`);

  // Base64 JPEG sample passport
  const samplePassportBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  // 2. Test updating existing student's passport via PATCH /api/students/[id]
  console.log("\n2. Testing PATCH /api/students/[id] with passport photo...");
  const patchRes = await fetch(`${baseUrl}/api/students/${targetStudent.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      passportPhoto: samplePassportBase64,
    }),
  });

  const patchData = await patchRes.json();
  if (!patchRes.ok || !patchData.success) {
    throw new Error(`PATCH /api/students/[id] failed: ${JSON.stringify(patchData)}`);
  }
  console.log("PATCH response:", patchData.message);
  console.log("Saved passportPhoto length:", patchData.student?.passportPhoto?.length);

  // 3. Verify via GET /api/students/[id]
  console.log("\n3. Testing GET /api/students/[id] to verify Neon DB persistence...");
  const getStudentRes = await fetch(`${baseUrl}/api/students/${targetStudent.id}`);
  const getStudentData = await getStudentRes.json();
  if (!getStudentRes.ok || !getStudentData.success) {
    throw new Error(`GET /api/students/[id] failed: ${JSON.stringify(getStudentData)}`);
  }

  if (getStudentData.student.passportPhoto === samplePassportBase64) {
    console.log("PASS: Passport photo successfully retrieved from /api/students/[id]!");
  } else {
    throw new Error("FAIL: Passport photo does not match sample!");
  }

  // 4. Verify terminal report card endpoint GET /api/reports/[studentId] includes passportPhoto
  console.log("\n4. Testing GET /api/reports/[studentId] to verify passport photo on report card...");
  const repRes = await fetch(`${baseUrl}/api/reports/${targetStudent.id}`);
  const repData = await repRes.json();
  if (!repRes.ok || !repData.success) {
    throw new Error(`GET /api/reports/[studentId] failed: ${JSON.stringify(repData)}`);
  }

  if (repData.student.passportPhoto === samplePassportBase64) {
    console.log("PASS: Passport photo is present in the official Report Card student payload!");
  } else {
    throw new Error("FAIL: Passport photo missing from report card payload!");
  }

  // 5. Test enrolling a new student with passport photo via POST /api/students
  console.log("\n5. Testing POST /api/students with passport photo...");
  const newStudentPayload = {
    firstName: "Zainab",
    lastName: "Olawale",
    otherName: "Amina",
    section: "PRIMARY",
    classLevel: "Basic 2",
    arm: "Silver",
    gender: "FEMALE",
    dateOfBirth: "2018-04-12",
    bloodGroup: "AA",
    address: "7 Unity Crescent, Lagos",
    passportPhoto: samplePassportBase64,
    guardianName: "Mrs. Halimat Olawale",
    guardianPhone: "+234 803 555 7788",
    guardianEmail: "halimat.olawale@example.com",
    guardianAddress: "7 Unity Crescent, Lagos",
  };

  const createRes = await fetch(`${baseUrl}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newStudentPayload),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.success) {
    throw new Error(`POST /api/students failed: ${JSON.stringify(createData)}`);
  }

  console.log("New student enrolled:", createData.student?.admissionNo);
  if (createData.student?.passportPhoto === samplePassportBase64) {
    console.log("PASS: New student enrolled with passportPhoto persisted to Neon DB!");
  } else {
    throw new Error("FAIL: New student passportPhoto was not persisted!");
  }

  // 6. Test pupil/student registration with passport photo via POST /api/auth/register
  console.log("\n6. Testing POST /api/auth/register for student with passport photo...");
  const regPayload = {
    name: "Toluwani Balogun",
    email: `student.passport.${Date.now()}@mathal.edu.ng`,
    password: "StudentPassword123!",
    role: "STUDENT",
    phone: "+234 812 444 6677",
    section: "SECONDARY",
    classLevel: "JSS 2",
    arm: "Diamond",
    gender: "MALE",
    dateOfBirth: "2013-09-20",
    bloodGroup: "O+",
    address: "15 Victoria Island Road",
    passportPhoto: samplePassportBase64,
    guardianName: "Engr. Deji Balogun",
    guardianPhone: "+234 802 111 3344",
  };

  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(regPayload),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(`POST /api/auth/register failed: ${JSON.stringify(regData)}`);
  }

  console.log(`Registered student user: ${regData.user.name} (${regData.user.admissionNo})`);
  
  // Verify student profile created in Neon DB for this registration has passportPhoto
  const regStudentRes = await fetch(`${baseUrl}/api/students/${regData.user.studentId}`);
  const regStudentData = await regStudentRes.json();

  if (regStudentData.student?.passportPhoto === samplePassportBase64) {
    console.log("PASS: Registered student user profile has passport photo verified in Neon DB!");
  } else {
    throw new Error("FAIL: Registered student user passport photo not found!");
  }

  console.log("\n=======================================================");
  console.log("ALL STUDENT PASSPORT UPLOAD & RETRIEVAL TESTS PASSED!");
  console.log("=======================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
