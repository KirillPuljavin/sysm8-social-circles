import { prisma } from "./prisma";
import type { User } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Resolve the authenticated user.
 * Priority:
 *  1. Clerk session (production auth via Google etc.)
 *  2. DEMO_MODE cookie (`demo_user=<name>`) — for demo/local without real auth
 *  3. Azure SWA `x-ms-client-principal` header (legacy, kept for backward compat)
 *  4. NODE_ENV=development fallback to mock dev user
 *
 * @param headers - Request headers (used for cookie + legacy SWA header)
 * @returns User row or null
 */
export async function getAuthenticatedUser(headers: Headers): Promise<User | null> {
  // 1. Clerk
  try {
    const { userId } = await auth();
    if (userId) {
      const clerkUser = await currentUser();
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (email) {
        const name =
          clerkUser?.firstName ||
          clerkUser?.username ||
          email.split("@")[0];
        return await prisma.user.upsert({
          where: { email },
          update: { azureId: userId, name },
          create: { azureId: userId, email, name },
        });
      }
    }
  } catch {
    // No Clerk context (e.g. called outside request) — fall through
  }

  // 2. DEMO_MODE cookie
  if (process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development") {
    const cookieHeader = headers.get("cookie") || "";
    const match = cookieHeader.match(/(?:^|;\s*)demo_user=([a-zA-Z0-9_-]{1,32})/);
    if (match || process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development") {
      const name = match ? match[1] : "dev";
      const email = name + "@localhost.local";
      return await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          azureId: "mock-" + name,
          email,
          name: name === "dev" ? "Dev User" : name,
        },
      });
    }
  }

  return null;
}

/**
 * Check if user is a member of a specific server
 */
export async function isServerMember(userId: string, serverId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { userId, serverId },
  });
  return member !== null;
}
