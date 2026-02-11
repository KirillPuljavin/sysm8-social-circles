import { prisma } from "./prisma";
import type { User } from "@prisma/client";

/**
 * Azure SWA Client Principal structure
 * Injected via x-ms-client-principal header (Base64-encoded JSON)
 */
interface ClientPrincipal {
  identityProvider: string; // "google"
  userId: string; // Persistent unique ID
  userDetails: string; // Email
  userRoles: string[]; // ["anonymous"] or ["authenticated"]
}

/**
 * Extract and validate authenticated user from Azure SWA headers
 * Performs JIT sync: creates user in DB if not exists
 *
 * @param headers - Request headers from Next.js route handler
 * @returns User object if authenticated, null if anonymous
 */
export async function getAuthenticatedUser(headers: Headers): Promise<User | null> {
  const header = headers.get("x-ms-client-principal");

  if (!header) {
    if (process.env.NODE_ENV === "development") {
      const mockUser = await prisma.user.upsert({
        where: { email: "dev@localhost.local" },
        update: {},
        create: {
          azureId: "dev-mock-123",
          email: "dev@localhost.local",
          name: "Dev User",
        },
      });
      return mockUser;
    }

    return null;
  }

  let principal: ClientPrincipal;

  try {
    const decoded = Buffer.from(header, "base64").toString("ascii");
    principal = JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to decode x-ms-client-principal header:", error);
    return null;
  }

  if (!principal.userRoles.includes("authenticated")) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: { email: principal.userDetails },
    update: {
      azureId: principal.userId, // Updates to current provider's ID
      name: principal.userDetails.split('@')[0], // Extract name from email
    },
    create: {
      azureId: principal.userId,
      email: principal.userDetails,
      name: principal.userDetails.split('@')[0],
    },
  });

  return user;
}

/**
 * Check if user is a member of a specific server
 *
 * @param userId - Internal user UUID
 * @param serverId - Server UUID
 * @returns true if user is a member, false otherwise
 */
export async function isServerMember(userId: string, serverId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: {
      userId,
      serverId,
    },
  });

  return member !== null;
}
