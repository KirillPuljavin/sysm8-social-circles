// Server CRUD: Create Server
// Authorization: Any authenticated user can create a server (becomes owner)

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * POST /api/servers
 * Creates a new server with the authenticated user as owner
 */
export async function POST(request: NextRequest) {
  // Step 1: Authenticate user
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: No valid session" },
      { status: 401 },
    );
  }

  // Step 2: Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { name, isRestricted } = body;

  // Step 3: Validate input
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Server name is required" },
      { status: 400 },
    );
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Server name must be 100 characters or less" },
      { status: 400 },
    );
  }

  // Step 4: Create server + owner membership in transaction
  const server = await prisma.server.create({
    data: {
      name: name.trim(),
      inviteCode: nanoid(10), // Generate unique invite code
      isRestricted: isRestricted === true,
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: MemberRole.OWNER,
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
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
    },
  });

  // Step 5: Return created server
  return NextResponse.json(
    {
      id: server.id,
      name: server.name,
      inviteCode: server.inviteCode,
      isRestricted: server.isRestricted,
      owner: server.owner,
      members: server.members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        createdAt: m.createdAt,
      })),
      createdAt: server.createdAt,
    },
    { status: 201 }, // 201 Created
  );
}
