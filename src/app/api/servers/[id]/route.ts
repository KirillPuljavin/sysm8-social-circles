// Protected API: Get Server Data
// Authorization: User must be authenticated AND a member of the server
// Flow: Azure SWA Auth → JIT Sync → Server Membership Check → Data Return

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isServerMember } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/servers/[id]
 * Returns server data if user is authenticated and a member
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Extract serverId from route params (Next.js 16 async params)
  const { id: serverId } = await context.params;

  // Step 1: Authenticate user via Azure SWA header + JIT sync
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: No valid session" },
      { status: 401 },
    );
  }

  // Step 2: Check server membership
  const isMember = await isServerMember(user.id, serverId);

  if (!isMember) {
    return NextResponse.json(
      { error: "Forbidden: You are not a member of this server" },
      { status: 403 },
    );
  }

  // Step 3: Fetch server data
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }

  // Step 4: Return server data
  return NextResponse.json({
    id: server.id,
    name: server.name,
    inviteCode: server.inviteCode,
    isRestricted: server.isRestricted,
    owner: {
      id: server.owner.id,
      email: server.owner.email,
      name: server.owner.name,
    },
    members: server.members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      createdAt: m.createdAt,
    })),
    createdAt: server.createdAt,
  });
}
