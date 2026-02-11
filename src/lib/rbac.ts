import { prisma } from "./prisma";
import { MemberRole } from "@prisma/client";

/**
 * Get member record with role for a user in a server
 * @returns Member object or null if not a member
 */
export async function getServerMember(userId: string, serverId: string) {
  return await prisma.member.findFirst({
    where: {
      userId,
      serverId,
    },
    include: {
      server: true,
      user: true,
    },
  });
}

/**
 * Check if user is server owner
 */
export async function isServerOwner(userId: string, serverId: string): Promise<boolean> {
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { ownerId: true },
  });
  return server?.ownerId === userId;
}

/**
 * Check if user has at least MODERATOR role
 */
export async function canModerate(userId: string, serverId: string): Promise<boolean> {
  const member = await getServerMember(userId, serverId);
  if (!member) return false;
  return member.role === MemberRole.OWNER || member.role === MemberRole.MODERATOR;
}

/**
 * Check if user can post in server (respects isRestricted flag)
 */
export async function canPost(userId: string, serverId: string): Promise<boolean> {
  const member = await getServerMember(userId, serverId);
  if (!member) return false;

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { isRestricted: true },
  });

  if (!server) return false;

  if (server.isRestricted && member.role === MemberRole.GUEST) {
    return false;
  }

  return true;
}

/**
 * Check if actor can kick target member
 * Rules:
 * - Owner can kick anyone except themselves
 * - Moderator can kick guests
 * - Guests cannot kick anyone
 */
export async function canKickMember(
  actorId: string,
  targetMemberId: string,
  serverId: string
): Promise<boolean> {
  const actor = await getServerMember(actorId, serverId);
  const target = await prisma.member.findUnique({
    where: { id: targetMemberId },
    include: { user: true },
  });

  if (!actor || !target) return false;
  if (target.serverId !== serverId) return false; // Target not in this server

  // Cannot kick yourself
  if (actor.userId === target.userId) return false;

  // Owner cannot be kicked
  if (target.role === MemberRole.OWNER) return false;

  // Owner can kick moderators and guests
  if (actor.role === MemberRole.OWNER) {
    return target.role === MemberRole.MODERATOR || target.role === MemberRole.GUEST;
  }

  // Moderator can only kick guests
  if (actor.role === MemberRole.MODERATOR) {
    return target.role === MemberRole.GUEST;
  }

  // Guests cannot kick anyone
  return false;
}

/**
 * Check if actor can delete target message
 * Rules:
 * - Anyone can delete their own messages
 * - Owner/Mod can delete guest messages
 * - Owner/Mod can delete moderator messages
 * - Only Owner can delete owner messages
 */
export async function canDeleteMessage(
  actorId: string,
  messageId: string,
  serverId: string
): Promise<boolean> {
  const actor = await getServerMember(actorId, serverId);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      member: {
        include: { user: true },
      },
    },
  });

  if (!actor || !message) return false;
  if (message.serverId !== serverId) return false; // Message not in this server

  // Rule 1: Anyone can delete their own messages
  if (message.member.userId === actorId) return true;

  // Rule 2: Owner/Mod can delete guest messages
  if (
    message.member.role === MemberRole.GUEST &&
    (actor.role === MemberRole.OWNER || actor.role === MemberRole.MODERATOR)
  ) {
    return true;
  }

  // Rule 3: Owner/Mod can delete moderator messages
  if (
    message.member.role === MemberRole.MODERATOR &&
    (actor.role === MemberRole.OWNER || actor.role === MemberRole.MODERATOR)
  ) {
    return true;
  }

  // Rule 4: Only Owner can delete owner messages (except their own, handled in Rule 1)
  if (message.member.role === MemberRole.OWNER && actor.role === MemberRole.OWNER) {
    return true;
  }

  return false;
}

/**
 * Check if user can generate invite codes
 * Rule: Owner and Moderator only
 */
export async function canGenerateInvite(userId: string, serverId: string): Promise<boolean> {
  return await canModerate(userId, serverId);
}

/**
 * Check if user can edit server settings
 * Rule: Owner only
 */
export async function canEditServer(userId: string, serverId: string): Promise<boolean> {
  return await isServerOwner(userId, serverId);
}

/**
 * Check if user can delete server
 * Rule: Owner only
 */
export async function canDeleteServer(userId: string, serverId: string): Promise<boolean> {
  return await isServerOwner(userId, serverId);
}
