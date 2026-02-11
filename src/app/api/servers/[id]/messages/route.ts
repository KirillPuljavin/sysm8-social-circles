import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerMember, canPost } from "@/lib/rbac";
import { createMessageSchema } from "@/lib/validations/message";
import { Prisma } from "@prisma/client";

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

    // Cursor pagination: Get 'before' and 'limit' from query params
    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 100);

    // Build where clause for cursor
    const where: Prisma.MessageWhereInput = { serverId };

    if (before) {
      // Get the cursor message to compare against
      const cursorMessage = await prisma.message.findUnique({
        where: { id: before },
        select: { sentAt: true, sequence: true, id: true },
      });

      if (cursorMessage) {
        // Fetch messages before this cursor (older messages)
        where.OR = [
          { sentAt: { lt: cursorMessage.sentAt } },
          {
            sentAt: cursorMessage.sentAt,
            sequence: { lt: cursorMessage.sequence },
          },
          {
            sentAt: cursorMessage.sentAt,
            sequence: cursorMessage.sequence,
            id: { lt: cursorMessage.id },
          },
        ];
      }
    }

    // Fetch messages with proper ordering
    const messages = await prisma.message.findMany({
      where,
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
      orderBy: [
        { sentAt: "desc" },
        { sequence: "desc" },
        { id: "desc" },
      ],
      take: limit,
    });

    // Reverse to get chronological order (oldest to newest)
    const orderedMessages = messages.reverse();

    return NextResponse.json({ messages: orderedMessages });
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

    // Clock skew validation (±5 minutes)
    const serverTime = new Date();
    const clientTime = new Date(validation.data.sentAt);
    const skewMs = Math.abs(serverTime.getTime() - clientTime.getTime());

    if (skewMs > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: "Client clock skew too large. Please sync your system clock." },
        { status: 400 }
      );
    }

    // Idempotency check: Check if message with this clientId already exists
    const existing = await prisma.message.findUnique({
      where: { clientId: validation.data.clientId },
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

    if (existing) {
      // Idempotent: Verify content and sequence match
      if (
        existing.content !== validation.data.content ||
        existing.sequence !== validation.data.sequence
      ) {
        return NextResponse.json(
          { error: "Duplicate clientId with different content/sequence" },
          { status: 409 }
        );
      }
      // Return existing message (idempotent success)
      return NextResponse.json(existing, { status: 201 });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        clientId: validation.data.clientId,
        content: validation.data.content,
        sentAt: clientTime,
        sequence: validation.data.sequence,
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
