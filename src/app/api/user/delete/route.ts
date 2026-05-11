import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

/**
 * DELETE /api/user/delete
 * GDPR Compliance: Delete user account and all associated data.
 *
 * Bidirectional deletion (Direction 1):
 *  1. Delete the Clerk identity (best-effort; logged on failure but doesn't block)
 *  2. Delete the local DB row — cascades to memberships, owned servers, messages
 *
 * The Clerk-side delete fires first so a transient Clerk failure doesn't
 * leave the user in a state where their DB record is gone but Clerk still
 * lets them sign in. If Clerk delete fails, DB delete is skipped and the
 * caller can retry. (Direction 2: Clerk → DB via webhook on `user.deleted`,
 * not yet implemented.)
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Delete Clerk identity first
    // user.azureId stores the Clerk userId (legacy field name from Azure days)
    if (user.azureId && user.azureId.startsWith("user_")) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(user.azureId);
      } catch (clerkErr) {
        console.error("Clerk delete failed:", clerkErr);
        return NextResponse.json(
          { error: "Failed to delete authentication identity" },
          { status: 502 }
        );
      }
    }

    // 2. Delete local user (cascade deletes all related data via Prisma schema)
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
