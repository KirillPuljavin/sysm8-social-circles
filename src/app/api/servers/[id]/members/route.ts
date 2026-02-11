import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerMember } from "@/lib/rbac";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]/members
 * List all members in a server with their roles (requires membership)
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const headersList = await headers();
    const user = await getAuthenticatedUser(headersList);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: serverId } = await context.params;

    // Check membership
    const member = await getServerMember(user.id, serverId);
    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this server" },
        { status: 403 }
      );
    }

    // Fetch all members with user info
    const members = await prisma.member.findMany({
      where: { serverId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then MODERATOR, then GUEST
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("GET /api/servers/[id]/members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
