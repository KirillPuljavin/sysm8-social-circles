import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/export
 * GDPR Compliance: Export all user data
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request.headers);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all user data
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            server: {
              select: {
                id: true,
                name: true,
                createdAt: true,
              },
            },
            messages: {
              select: {
                id: true,
                content: true,
                sentAt: true,
                createdAt: true,
              },
            },
          },
        },
        servers: {
          include: {
            members: {
              select: {
                id: true,
                role: true,
                createdAt: true,
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
            messages: {
              select: {
                id: true,
                content: true,
                sentAt: true,
                createdAt: true,
                member: {
                  select: {
                    user: {
                      select: {
                        email: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Format export data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: "GDPR Data Export",
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        createdAt: userData.createdAt,
      },
      memberships: userData.memberships.map((m) => ({
        serverId: m.server.id,
        serverName: m.server.name,
        role: m.role,
        joinedAt: m.createdAt,
        messageCount: m.messages.length,
      })),
      ownedServers: userData.servers.map((s) => ({
        id: s.id,
        name: s.name,
        isRestricted: s.isRestricted,
        createdAt: s.createdAt,
        memberCount: s.members.length,
        messageCount: s.messages.length,
      })),
      messages: userData.memberships.flatMap((m) =>
        m.messages.map((msg) => ({
          serverId: m.server.id,
          serverName: m.server.name,
          content: msg.content,
          sentAt: msg.sentAt,
        }))
      ),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
