import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/user/delete
 * GDPR Compliance: Delete user account and all associated data
 * Cascade deletes handle: memberships, owned servers, messages
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete user (cascade deletes all related data via Prisma schema)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
