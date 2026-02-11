import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberRole } from '@prisma/client';
import {
  canKickMember,
  canDeleteMessage,
  isServerOwner,
  canPost,
  canGenerateInvite,
  canEditServer,
  canDeleteServer,
} from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    member: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    server: {
      findUnique: vi.fn(),
    },
    message: {
      findUnique: vi.fn(),
    },
  },
}));

describe('RBAC Authorization Matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Management (canDeleteMessage)', () => {
    const serverId = 'server-1';
    const messageId = 'msg-1';

    it('BDD: User can delete their own message', async () => {
      const userId = 'user-1';

      // Mock: Actor is a GUEST
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-1',
        userId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
      });

      // Mock: Message belongs to the same user
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: messageId,
        clientId: 'client-1',
        content: 'Test message',
        status: 'SENT',
        sentAt: new Date(),
        sequence: 1,
        memberId: 'member-1',
        serverId,
        createdAt: new Date(),
        member: {
          id: 'member-1',
          userId,
          serverId,
          role: MemberRole.GUEST,
          createdAt: new Date(),
          user: {
            id: userId,
            azureId: 'azure-1',
            email: 'user@test.com',
            name: 'Test User',
            createdAt: new Date(),
          },
        },
      });

      const result = await canDeleteMessage(userId, messageId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: OWNER can delete GUEST message', async () => {
      const ownerId = 'owner-1';
      const guestId = 'guest-1';

      // Mock: Actor is OWNER
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-owner',
        userId: ownerId,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
      });

      // Mock: Message belongs to GUEST
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: messageId,
        clientId: 'client-1',
        content: 'Guest message',
        status: 'SENT',
        sentAt: new Date(),
        sequence: 1,
        memberId: 'member-guest',
        serverId,
        createdAt: new Date(),
        member: {
          id: 'member-guest',
          userId: guestId,
          serverId,
          role: MemberRole.GUEST,
          createdAt: new Date(),
          user: {
            id: guestId,
            azureId: 'azure-guest',
            email: 'guest@test.com',
            name: 'Guest User',
            createdAt: new Date(),
          },
        },
      });

      const result = await canDeleteMessage(ownerId, messageId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: GUEST cannot delete MODERATOR message', async () => {
      const guestId = 'guest-1';
      const modId = 'mod-1';

      // Mock: Actor is GUEST
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-guest',
        userId: guestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
      });

      // Mock: Message belongs to MODERATOR
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: messageId,
        clientId: 'client-1',
        content: 'Mod message',
        status: 'SENT',
        sentAt: new Date(),
        sequence: 1,
        memberId: 'member-mod',
        serverId,
        createdAt: new Date(),
        member: {
          id: 'member-mod',
          userId: modId,
          serverId,
          role: MemberRole.MODERATOR,
          createdAt: new Date(),
          user: {
            id: modId,
            azureId: 'azure-mod',
            email: 'mod@test.com',
            name: 'Mod User',
            createdAt: new Date(),
          },
        },
      });

      const result = await canDeleteMessage(guestId, messageId, serverId);
      expect(result).toBe(false);
    });

    it('BDD: MODERATOR can delete MODERATOR message', async () => {
      const mod1Id = 'mod-1';
      const mod2Id = 'mod-2';

      // Mock: Actor is MODERATOR
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-mod1',
        userId: mod1Id,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
      });

      // Mock: Message belongs to another MODERATOR
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: messageId,
        clientId: 'client-1',
        content: 'Mod message',
        status: 'SENT',
        sentAt: new Date(),
        sequence: 1,
        memberId: 'member-mod2',
        serverId,
        createdAt: new Date(),
        member: {
          id: 'member-mod2',
          userId: mod2Id,
          serverId,
          role: MemberRole.MODERATOR,
          createdAt: new Date(),
          user: {
            id: mod2Id,
            azureId: 'azure-mod2',
            email: 'mod2@test.com',
            name: 'Mod 2',
            createdAt: new Date(),
          },
        },
      });

      const result = await canDeleteMessage(mod1Id, messageId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: OWNER can delete OWNER message', async () => {
      const owner1Id = 'owner-1';
      const owner2Id = 'owner-2';

      // Mock: Actor is OWNER
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-owner1',
        userId: owner1Id,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
      });

      // Mock: Message belongs to another OWNER (edge case)
      vi.mocked(prisma.message.findUnique).mockResolvedValue({
        id: messageId,
        clientId: 'client-1',
        content: 'Owner message',
        status: 'SENT',
        sentAt: new Date(),
        sequence: 1,
        memberId: 'member-owner2',
        serverId,
        createdAt: new Date(),
        member: {
          id: 'member-owner2',
          userId: owner2Id,
          serverId,
          role: MemberRole.OWNER,
          createdAt: new Date(),
          user: {
            id: owner2Id,
            azureId: 'azure-owner2',
            email: 'owner2@test.com',
            name: 'Owner 2',
            createdAt: new Date(),
          },
        },
      });

      const result = await canDeleteMessage(owner1Id, messageId, serverId);
      expect(result).toBe(true);
    });
  });

  describe('Member Management (canKickMember)', () => {
    const serverId = 'server-1';

    it('BDD: MODERATOR can kick GUEST', async () => {
      const modId = 'mod-1';
      const guestId = 'guest-1';
      const guestMemberId = 'member-guest';

      // Mock: Actor is MODERATOR
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-mod',
        userId: modId,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
      });

      // Mock: Target is GUEST
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: guestMemberId,
        userId: guestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
        user: {
          id: guestId,
          azureId: 'azure-guest',
          email: 'guest@test.com',
          name: 'Guest User',
          createdAt: new Date(),
        },
      });

      const result = await canKickMember(modId, guestMemberId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: MODERATOR cannot kick OWNER', async () => {
      const modId = 'mod-1';
      const ownerId = 'owner-1';
      const ownerMemberId = 'member-owner';

      // Mock: Actor is MODERATOR
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-mod',
        userId: modId,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
      });

      // Mock: Target is OWNER
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: ownerMemberId,
        userId: ownerId,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
        user: {
          id: ownerId,
          azureId: 'azure-owner',
          email: 'owner@test.com',
          name: 'Owner User',
          createdAt: new Date(),
        },
      });

      const result = await canKickMember(modId, ownerMemberId, serverId);
      expect(result).toBe(false);
    });

    it('BDD: OWNER can kick MODERATOR', async () => {
      const ownerId = 'owner-1';
      const modId = 'mod-1';
      const modMemberId = 'member-mod';

      // Mock: Actor is OWNER
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-owner',
        userId: ownerId,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
      });

      // Mock: Target is MODERATOR
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: modMemberId,
        userId: modId,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
        user: {
          id: modId,
          azureId: 'azure-mod',
          email: 'mod@test.com',
          name: 'Mod User',
          createdAt: new Date(),
        },
      });

      const result = await canKickMember(ownerId, modMemberId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: GUEST cannot kick anyone', async () => {
      const guestId = 'guest-1';
      const targetGuestId = 'guest-2';
      const targetMemberId = 'member-guest2';

      // Mock: Actor is GUEST
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-guest1',
        userId: guestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
      });

      // Mock: Target is also GUEST
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: targetMemberId,
        userId: targetGuestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
        user: {
          id: targetGuestId,
          azureId: 'azure-guest2',
          email: 'guest2@test.com',
          name: 'Guest 2',
          createdAt: new Date(),
        },
      });

      const result = await canKickMember(guestId, targetMemberId, serverId);
      expect(result).toBe(false);
    });

    it('BDD: User cannot kick themselves', async () => {
      const userId = 'user-1';
      const memberId = 'member-1';

      // Mock: Actor is OWNER
      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: memberId,
        userId,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
      });

      // Mock: Target is same user
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: memberId,
        userId,
        serverId,
        role: MemberRole.OWNER,
        createdAt: new Date(),
        user: {
          id: userId,
          azureId: 'azure-1',
          email: 'user@test.com',
          name: 'User',
          createdAt: new Date(),
        },
      });

      const result = await canKickMember(userId, memberId, serverId);
      expect(result).toBe(false);
    });
  });

  describe('Role Management Permissions', () => {
    const serverId = 'server-1';
    const userId = 'user-1';

    it('BDD: Only OWNER can change member roles', async () => {
      // Test isServerOwner (used for role changes)
      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: false,
        ownerId: userId,
        createdAt: new Date(),
      });

      const result = await isServerOwner(userId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: Non-owner cannot change member roles', async () => {
      const nonOwnerId = 'non-owner-1';

      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: false,
        ownerId: 'different-user',
        createdAt: new Date(),
      });

      const result = await isServerOwner(nonOwnerId, serverId);
      expect(result).toBe(false);
    });
  });

  describe('Server Management Permissions', () => {
    const serverId = 'server-1';

    it('BDD: OWNER and MODERATOR can generate invites', async () => {
      const modId = 'mod-1';

      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-mod',
        userId: modId,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
        server: {
          id: serverId,
          name: 'Test Server',
          inviteCode: 'test123',
          isRestricted: false,
          ownerId: 'owner-1',
          createdAt: new Date(),
        },
        user: {
          id: modId,
          azureId: 'azure-mod',
          email: 'mod@test.com',
          name: 'Mod',
          createdAt: new Date(),
        },
      });

      const result = await canGenerateInvite(modId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: GUEST cannot generate invites', async () => {
      const guestId = 'guest-1';

      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-guest',
        userId: guestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
        server: {
          id: serverId,
          name: 'Test Server',
          inviteCode: 'test123',
          isRestricted: false,
          ownerId: 'owner-1',
          createdAt: new Date(),
        },
        user: {
          id: guestId,
          azureId: 'azure-guest',
          email: 'guest@test.com',
          name: 'Guest',
          createdAt: new Date(),
        },
      });

      const result = await canGenerateInvite(guestId, serverId);
      expect(result).toBe(false);
    });

    it('BDD: Only OWNER can edit server settings', async () => {
      const ownerId = 'owner-1';

      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: false,
        ownerId,
        createdAt: new Date(),
      });

      const result = await canEditServer(ownerId, serverId);
      expect(result).toBe(true);
    });

    it('BDD: Only OWNER can delete server', async () => {
      const ownerId = 'owner-1';

      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: false,
        ownerId,
        createdAt: new Date(),
      });

      const result = await canDeleteServer(ownerId, serverId);
      expect(result).toBe(true);
    });
  });

  describe('Restricted Server Posting', () => {
    const serverId = 'server-1';

    it('BDD: GUEST cannot post in restricted server', async () => {
      const guestId = 'guest-1';

      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-guest',
        userId: guestId,
        serverId,
        role: MemberRole.GUEST,
        createdAt: new Date(),
        server: {
          id: serverId,
          name: 'Test Server',
          inviteCode: 'test123',
          isRestricted: false,
          ownerId: 'owner-1',
          createdAt: new Date(),
        },
        user: {
          id: guestId,
          azureId: 'azure-guest',
          email: 'guest@test.com',
          name: 'Guest',
          createdAt: new Date(),
        },
      });

      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: true, // Restricted server
        ownerId: 'owner-1',
        createdAt: new Date(),
      });

      const result = await canPost(guestId, serverId);
      expect(result).toBe(false);
    });

    it('BDD: MODERATOR can post in restricted server', async () => {
      const modId = 'mod-1';

      vi.mocked(prisma.member.findFirst).mockResolvedValue({
        id: 'member-mod',
        userId: modId,
        serverId,
        role: MemberRole.MODERATOR,
        createdAt: new Date(),
        server: {
          id: serverId,
          name: 'Test Server',
          inviteCode: 'test123',
          isRestricted: false,
          ownerId: 'owner-1',
          createdAt: new Date(),
        },
        user: {
          id: modId,
          azureId: 'azure-mod',
          email: 'mod@test.com',
          name: 'Mod',
          createdAt: new Date(),
        },
      });

      vi.mocked(prisma.server.findUnique).mockResolvedValue({
        id: serverId,
        name: 'Test Server',
        inviteCode: 'test123',
        isRestricted: true, // Restricted server
        ownerId: 'owner-1',
        createdAt: new Date(),
      });

      const result = await canPost(modId, serverId);
      expect(result).toBe(true);
    });
  });
});
