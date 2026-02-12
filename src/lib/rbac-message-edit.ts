import { prisma } from "./prisma";

/**
 * Check if user can edit a message
 * Rule: Only the message author can edit their own message
 */
export async function canEditMessage(
  userId: string,
  messageId: string,
  serverId: string
): Promise<boolean> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      member: {
        include: { user: true },
      },
    },
  });

  if (!message) return false;
  if (message.serverId !== serverId) return false;

  // Only author can edit their own message
  return message.member.userId === userId;
}
