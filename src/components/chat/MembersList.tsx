"use client";

import { useState } from "react";
import { MemberRole } from "@prisma/client";

interface Member {
  id: string;
  role: MemberRole;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface MembersListProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: MemberRole;
  serverId: string;
}

export default function MembersList({
  members,
  currentUserId,
  currentUserRole,
  serverId,
}: MembersListProps) {
  const [membersList, setMembersList] = useState<Member[]>(members);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [kickingMemberId, setKickingMemberId] = useState<string | null>(null);

  const isOwner = currentUserRole === MemberRole.OWNER;
  const isModerator = currentUserRole === MemberRole.MODERATOR;

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    setUpdatingMemberId(memberId);
    try {
      const res = await fetch(`/api/servers/${serverId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      const { member: updatedMember } = await res.json();

      // Update local state
      setMembersList((prev) =>
        prev.map((m) => (m.id === memberId ? updatedMember : m))
      );
    } catch (error) {
      console.error("Failed to update role:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update member role"
      );
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleKickMember = async (member: Member) => {
    const displayName = member.user.name || member.user.email;
    if (!confirm(`Kick ${displayName} from the server?`)) {
      return;
    }

    setKickingMemberId(member.id);
    try {
      const res = await fetch(`/api/servers/${serverId}/members/${member.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to kick member");
      }

      // Remove from local state
      setMembersList((prev) => prev.filter((m) => m.id !== member.id));
    } catch (error) {
      console.error("Failed to kick member:", error);
      alert(
        error instanceof Error ? error.message : "Failed to kick member"
      );
    } finally {
      setKickingMemberId(null);
    }
  };

  // Group members by role (use local state)
  const owners = membersList.filter((m) => m.role === MemberRole.OWNER);
  const moderators = membersList.filter((m) => m.role === MemberRole.MODERATOR);
  const guests = membersList.filter((m) => m.role === MemberRole.GUEST);

  const renderMember = (member: Member) => {
    const displayName = member.user.name || member.user.email;
    const isCurrentUser = member.user.id === currentUserId;
    const roleColor =
      member.role === MemberRole.OWNER
        ? "var(--color-accent-blue)"
        : member.role === MemberRole.MODERATOR
        ? "var(--color-warning)"
        : "var(--color-text-secondary)";

    const canManageRole =
      isOwner && member.role !== MemberRole.OWNER && !isCurrentUser;
    const isUpdating = updatingMemberId === member.id;

    // Kick permissions: Owner can kick anyone (except self), Mod can kick guests
    const canKick =
      !isCurrentUser &&
      member.role !== MemberRole.OWNER &&
      (isOwner || (isModerator && member.role === MemberRole.GUEST));
    const isKicking = kickingMemberId === member.id;

    return (
      <div
        key={member.id}
        className="flex items-center gap-sm p-sm rounded-md"
        style={{
          background: isCurrentUser ? "var(--color-bg-tertiary)" : "transparent",
        }}
      >
        <div className="avatar avatar-sm bg-tertiary" style={{ flexShrink: 0 }}>
          {displayName[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="text-sm font-medium"
            style={{
              margin: 0,
              color: roleColor,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
            {isCurrentUser && " (You)"}
          </p>
        </div>

        {/* Role Management (Owner only) */}
        {canManageRole && (
          <div style={{ flexShrink: 0 }}>
            {isUpdating ? (
              <span className="text-xs text-secondary">Updating...</span>
            ) : (
              <select
                value={member.role}
                onChange={(e) =>
                  handleRoleChange(member.id, e.target.value as MemberRole)
                }
                className="text-xs"
                style={{
                  padding: "var(--space-xs) var(--space-sm)",
                  background: "var(--color-bg-input)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                }}
              >
                <option value="MODERATOR">Moderator</option>
                <option value="GUEST">Guest</option>
              </select>
            )}
          </div>
        )}

        {/* Kick Button (Owner/Moderator) */}
        {canKick && (
          <button
            onClick={() => handleKickMember(member)}
            disabled={isKicking || isUpdating}
            className="text-xs"
            style={{
              padding: "var(--space-xs) var(--space-sm)",
              background: "var(--color-error)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-sm)",
              cursor: isKicking ? "not-allowed" : "pointer",
              opacity: isKicking || isUpdating ? 0.5 : 1,
            }}
          >
            {isKicking ? "..." : "Kick"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "var(--space-lg)",
        overflowY: "auto",
        height: "100%",
      }}
    >
      <h3 className="text-lg font-bold mb-lg">Members ({members.length})</h3>

      {/* Owners */}
      {owners.length > 0 && (
        <div className="mb-lg">
          <p className="text-xs text-tertiary font-semibold mb-sm">
            OWNER — {owners.length}
          </p>
          <div className="flex flex-col gap-xs">
            {owners.map(renderMember)}
          </div>
        </div>
      )}

      {/* Moderators */}
      {moderators.length > 0 && (
        <div className="mb-lg">
          <p className="text-xs text-tertiary font-semibold mb-sm">
            MODERATORS — {moderators.length}
          </p>
          <div className="flex flex-col gap-xs">
            {moderators.map(renderMember)}
          </div>
        </div>
      )}

      {/* Guests */}
      {guests.length > 0 && (
        <div>
          <p className="text-xs text-tertiary font-semibold mb-sm">
            GUESTS — {guests.length}
          </p>
          <div className="flex flex-col gap-xs">
            {guests.map(renderMember)}
          </div>
        </div>
      )}
    </div>
  );
}
