import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canDeleteMessage } from "@/lib/rbac";
import { canEditMessage } from "@/lib/rbac-message-edit";
import { z } from "zod";

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * PATCH /api/servers/[id]/messages/[messageId]
 * Edit a message
 * Authorization: Only message author can edit
 */
export async function PATCH(
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

    // Step 2: Parse and validate body
    const body = await request.json();
    const validation = editMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Step 3: Check if user can edit this message
    const canEdit = await canEditMessage(user.id, messageId, serverId);

    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own messages" },
        { status: 403 }
      );
    }

    // Step 4: Update message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content,
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Step 5: Return updated message
    return NextResponse.json({
      message: {
        id: updatedMessage.id,
        clientId: updatedMessage.clientId,
        content: updatedMessage.content,
        sentAt: updatedMessage.sentAt.toISOString(),
        sequence: updatedMessage.sequence,
        status: updatedMessage.status,
        serverId: updatedMessage.serverId,
        member: updatedMessage.member
          ? {
              id: updatedMessage.member.id,
              role: updatedMessage.member.role,
              user: updatedMessage.member.user,
            }
          : null,
        createdAt: updatedMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("PATCH /api/servers/[id]/messages/[messageId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
