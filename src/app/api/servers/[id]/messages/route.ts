import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerMember, canPost } from "@/lib/rbac";
import { createMessageSchema } from "@/lib/validations/message";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/servers/[id]/messages
 * List all messages in a server (requires membership)
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

    // Fetch messages with member and user info
    const messages = await prisma.message.findMany({
      where: { serverId },
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
      orderBy: { createdAt: "asc" },
      take: 100, // Limit to last 100 messages
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("GET /api/servers/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/servers/[id]/messages
 * Create a new message in a server (requires post permission)
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const headersList = await headers();
    const user = await getAuthenticatedUser(headersList);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: serverId } = await context.params;

    // Check membership and get member record
    const member = await getServerMember(user.id, serverId);
    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this server" },
        { status: 403 }
      );
    }

    // Check post permission (respects isRestricted)
    const hasPostPermission = await canPost(user.id, serverId);
    if (!hasPostPermission) {
      return NextResponse.json(
        { error: "You do not have permission to post in this server" },
        { status: 403 }
      );
    }

    // Validate input
    const body = await req.json();
    const validation = createMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: validation.data.content,
        memberId: member.id,
        serverId,
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

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("POST /api/servers/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
