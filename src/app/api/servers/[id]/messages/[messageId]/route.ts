import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteMessage } from "@/lib/rbac";

/**
 * DELETE /api/servers/[id]/messages/[messageId]
 * Delete a message
 * Authorization: RBAC matrix
 * - Anyone can delete their own messages
 * - Owner/Mod can delete guest messages
 * - Owner/Mod can delete moderator messages
 * - Only Owner can delete owner messages
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id: serverId, messageId } = await context.params;

    // Step 1: Authenticate user
    const user = await getAuthenticatedUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: No valid session" },
        { status: 401 }
      );
    }

    // Step 2: Check if user can delete this message (RBAC)
    const canDelete = await canDeleteMessage(user.id, messageId, serverId);

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this message" },
        { status: 403 }
      );
    }

    // Step 3: Delete message
    await prisma.message.delete({
      where: { id: messageId },
    });

    // Step 4: Return success
    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/servers/[id]/messages/[messageId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
