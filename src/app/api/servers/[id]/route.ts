// Protected API: Server CRUD (GET, PATCH, DELETE)
// Authorization: User must be authenticated AND a member of the server
// Flow: Azure SWA Auth → JIT Sync → RBAC Check → Operation

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isServerMember } from "@/lib/auth";
import { canEditServer, canDeleteServer } from "@/lib/rbac";
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

/**
 * PATCH /api/servers/[id]
 * Updates server settings (name, isRestricted)
 * Authorization: Owner only
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: serverId } = await context.params;

  // Step 1: Authenticate user
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: No valid session" },
      { status: 401 },
    );
  }

  // Step 2: Check ownership (RBAC)
  const canEdit = await canEditServer(user.id, serverId);

  if (!canEdit) {
    return NextResponse.json(
      { error: "Forbidden: Only the server owner can edit settings" },
      { status: 403 },
    );
  }

  // Step 3: Parse request body
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

  // Step 4: Validate input
  const updates: { name?: string; isRestricted?: boolean } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Server name cannot be empty" },
        { status: 400 },
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: "Server name must be 100 characters or less" },
        { status: 400 },
      );
    }
    updates.name = name.trim();
  }

  if (isRestricted !== undefined) {
    if (typeof isRestricted !== "boolean") {
      return NextResponse.json(
        { error: "isRestricted must be a boolean" },
        { status: 400 },
      );
    }
    updates.isRestricted = isRestricted;
  }

  // Step 5: Check if there's anything to update
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Step 6: Update server
  const server = await prisma.server.update({
    where: { id: serverId },
    data: updates,
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Step 7: Return updated server
  return NextResponse.json({
    id: server.id,
    name: server.name,
    inviteCode: server.inviteCode,
    isRestricted: server.isRestricted,
    owner: server.owner,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  });
}

/**
 * DELETE /api/servers/[id]
 * Deletes a server and all associated data (members, messages, etc.)
 * Authorization: Owner only
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: serverId } = await context.params;

  // Step 1: Authenticate user
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized: No valid session" },
      { status: 401 },
    );
  }

  // Step 2: Check ownership (RBAC)
  const canDelete = await canDeleteServer(user.id, serverId);

  if (!canDelete) {
    return NextResponse.json(
      { error: "Forbidden: Only the server owner can delete the server" },
      { status: 403 },
    );
  }

  // Step 3: Delete server (Prisma cascade deletes members/messages)
  await prisma.server.delete({
    where: { id: serverId },
  });

  // Step 4: Return success
  return NextResponse.json(
    { message: "Server deleted successfully" },
    { status: 200 },
  );
}
