// Server CRUD: Create Server
// Authorization: Any authenticated user can create a server (becomes owner)

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";
import { nanoid } from "nanoid";
import { createServerSchema } from "@/lib/validations/server";
import { ZodError } from "zod";

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

  // Step 2: Parse and validate request body with Zod
  let validatedData;
  try {
    const body = await request.json();
    validatedData = createServerSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Step 3: Create server + owner membership in transaction
  const server = await prisma.server.create({
    data: {
      name: validatedData.name,
      inviteCode: nanoid(10), // Generate unique invite code
      isRestricted: validatedData.isRestricted,
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
