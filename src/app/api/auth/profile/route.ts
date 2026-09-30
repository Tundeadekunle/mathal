import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Helper to authenticate user from session cookie or fallback
async function getSessionUser(req: NextRequest) {
  const sessionCookie = req.cookies.get("mathal_session")?.value;
  if (!sessionCookie) return null;

  try {
    const sessionData = JSON.parse(sessionCookie);
    if (!sessionData?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: sessionData.id },
      include: {
        teacher: true,
        student: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view profile." },
        { status: 401 }
      );
    }

    // Exclude password hash from response
    const { passwordHash, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      user: safeUser,
    });
  } catch (error: any) {
    console.error("Fetch profile error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const currentUser = await getSessionUser(req);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required to update profile." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      avatarUrl,
      currentPassword,
      newPassword,
      // Teacher specific
      title,
      qualification,
      // Student specific
      bloodGroup,
      dateOfBirth,
      address,
      passportPhoto,
      guardianName,
      guardianPhone,
      guardianEmail,
      guardianAddress,
    } = body;

    const userUpdateData: any = {};

    // 1. Full name validation
    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Full name cannot be empty." },
          { status: 400 }
        );
      }
      userUpdateData.name = name.trim();
    }

    // 2. Email validation & uniqueness
    if (email !== undefined && email.trim() !== currentUser.email) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: "insensitive" },
          id: { not: currentUser.id },
        },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: "This email address is already in use by another account." },
          { status: 400 }
        );
      }
      userUpdateData.email = cleanEmail;
    }

    // 3. Phone and Avatar
    if (phone !== undefined) {
      userUpdateData.phone = phone ? phone.trim() : null;
    }
    if (avatarUrl !== undefined) {
      userUpdateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
    }

    // 4. Password Change handling
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Please provide your current password to set a new password." },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: "Current password is incorrect. Please verify and try again." },
          { status: 400 }
        );
      }

      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      userUpdateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    // Execute user update
    await prisma.user.update({
      where: { id: currentUser.id },
      data: userUpdateData,
    });

    // 5. Update Teacher specific profile details if applicable
    if (currentUser.role === "TEACHER" && currentUser.teacher) {
      const teacherUpdateData: any = {};
      if (title !== undefined) teacherUpdateData.title = title ? title.trim() : null;
      if (qualification !== undefined) teacherUpdateData.qualification = qualification ? qualification.trim() : null;

      if (Object.keys(teacherUpdateData).length > 0) {
        await prisma.teacher.update({
          where: { id: currentUser.teacher.id },
          data: teacherUpdateData,
        });
      }
    }

    // 6. Update Student specific profile details if applicable
    if (currentUser.role === "STUDENT" && currentUser.student) {
      const studentUpdateData: any = {};
      if (bloodGroup !== undefined) studentUpdateData.bloodGroup = bloodGroup ? bloodGroup.trim() : null;
      if (address !== undefined) studentUpdateData.address = address ? address.trim() : null;
      if (passportPhoto !== undefined) studentUpdateData.passportPhoto = passportPhoto ? passportPhoto.trim() : null;
      if (guardianName !== undefined) studentUpdateData.guardianName = guardianName ? guardianName.trim() : currentUser.student.guardianName;
      if (guardianPhone !== undefined) studentUpdateData.guardianPhone = guardianPhone ? guardianPhone.trim() : currentUser.student.guardianPhone;
      if (guardianEmail !== undefined) studentUpdateData.guardianEmail = guardianEmail ? guardianEmail.trim() : null;
      if (guardianAddress !== undefined) studentUpdateData.guardianAddress = guardianAddress ? guardianAddress.trim() : null;

      if (dateOfBirth !== undefined) {
        if (!dateOfBirth) {
          studentUpdateData.dateOfBirth = null;
        } else {
          const parsed = new Date(dateOfBirth);
          if (!isNaN(parsed.getTime())) {
            studentUpdateData.dateOfBirth = parsed;
          }
        }
      }

      if (Object.keys(studentUpdateData).length > 0) {
        await prisma.student.update({
          where: { id: currentUser.student.id },
          data: studentUpdateData,
        });
      }
    }

    // Re-fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to load updated profile." }, { status: 500 });
    }

    // Construct session payload
    const sessionPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      phone: updatedUser.phone || undefined,
      avatarUrl: updatedUser.avatarUrl || undefined,
      studentId: updatedUser.student?.id,
      admissionNo: updatedUser.student?.admissionNo,
      passportPhoto: updatedUser.student?.passportPhoto || undefined,
      staffId: updatedUser.teacher?.staffId,
      teacherId: updatedUser.teacher?.id,
      assignedClasses: updatedUser.teacher?.assignedClasses,
      assignedSubjects: updatedUser.teacher?.assignedSubjects,
      assignedSection: updatedUser.teacher?.assignedSection,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: sessionPayload,
        fullProfile: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatarUrl,
          role: updatedUser.role,
          teacher: updatedUser.teacher,
          student: updatedUser.student,
        },
        message: "Your profile has been updated successfully!",
      },
      { status: 200 }
    );

    // Sync mathal_session cookie
    response.cookies.set("mathal_session", JSON.stringify(sessionPayload), {
      path: "/",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
