import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { isServerOwner } from "@/lib/rbac";
import { canKickMember } from "@/lib/rbac";
import { updateMemberRoleSchema } from "@/lib/validations/member";

/**
 * PATCH /api/servers/[id]/members/[memberId]
 * Update member role (Owner only)
 * Authorization: Server owner only
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: serverId, memberId } = await context.params;

    // Step 1: Authenticate user
    const user = await getAuthenticatedUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: No valid session" },
        { status: 401 }
      );
    }

    // Step 2: Check ownership (RBAC)
    const canManageRoles = await isServerOwner(user.id, serverId);

    if (!canManageRoles) {
      return NextResponse.json(
        { error: "Forbidden: Only the server owner can change roles" },
        { status: 403 }
      );
    }

    // Step 4: Validate request body
    const body = await request.json();
    const validation = updateMemberRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role } = validation.data;

    // Step 5: Get target member
    const targetMember = await prisma.member.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Step 6: Verify target belongs to this server
    if (targetMember.serverId !== serverId) {
      return NextResponse.json(
        { error: "Member does not belong to this server" },
        { status: 400 }
      );
    }

    // Step 7: Prevent changing owner role
    if (targetMember.role === MemberRole.OWNER) {
      return NextResponse.json(
        { error: "Cannot change the role of the server owner" },
        { status: 403 }
      );
    }

    // Step 8: Update role
    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Step 9: Return success
    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error) {
    console.error("PATCH /api/servers/[id]/members/[memberId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/servers/[id]/members/[memberId]
 * Kick member from server
 * Authorization: Owner can kick anyone (except self), Moderator can kick guests
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: serverId, memberId } = await context.params;

    // Step 1: Authenticate user
    const user = await getAuthenticatedUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: No valid session" },
        { status: 401 }
      );
    }

    // Step 2: Check if user can kick this member (RBAC)
    const canKick = await canKickMember(user.id, memberId, serverId);

    if (!canKick) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to kick this member" },
        { status: 403 }
      );
    }

    // Step 3: Delete member
    await prisma.member.delete({
      where: { id: memberId },
    });

    // Step 4: Return success
    return NextResponse.json({
      success: true,
      message: "Member kicked successfully",
    });
  } catch (error) {
    console.error("DELETE /api/servers/[id]/members/[memberId] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
