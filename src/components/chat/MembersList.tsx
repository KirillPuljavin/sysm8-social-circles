"use client";

import { useState } from "react";
import { MemberRole } from "@prisma/client";
import { useDebug } from "@/contexts/DebugContext";

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
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const { isDebug, logAction } = useDebug();

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

      const data = await res.json();

      if (!res.ok) {
        // Log debug action for failed role change
        if (isDebug) {
          logAction("PATCH", `/api/servers/${serverId}/members/${memberId}`, res.status, data.error || "Failed to update role");
        }
        throw new Error(data.error || "Failed to update role");
      }

      // Log debug action for successful role change
      if (isDebug) {
        logAction("PATCH", `/api/servers/${serverId}/members/${memberId}`, res.status, `Role updated to ${newRole}`);
      }

      const { member: updatedMember } = data;

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

      const data = await res.json();

      if (!res.ok) {
        // Log debug action for failed kick
        if (isDebug) {
          logAction("DELETE", `/api/servers/${serverId}/members/${member.id}`, res.status, data.error || "Failed to kick member");
        }
        throw new Error(data.error || "Failed to kick member");
      }

      // Log debug action for successful kick
      if (isDebug) {
        logAction("DELETE", `/api/servers/${serverId}/members/${member.id}`, res.status, "Member kicked");
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
    const isCurrentUser = member.user.id === currentUserId;
    const isExpanded = expandedMemberId === member.id;
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

    // In debug mode, show ALL actions (even on owners, except managing self)
    const showManageRole = canManageRole || (isDebug && !isCurrentUser);
    const showKick = canKick || (isDebug && !isCurrentUser);
    const hasActions = showManageRole || showKick;

    const toggleExpand = () => {
      if (!hasActions) return;
      setExpandedMemberId(isExpanded ? null : member.id);
    };

    return (
      <div
        key={member.id}
        className={`member-item ${isCurrentUser ? "is-current-user" : ""}`}
      >
        {/* Main Row: Avatar + Email + Chevron */}
        <div
          className={`member-row ${hasActions ? "clickable" : ""}`}
          onClick={hasActions ? toggleExpand : undefined}
        >
          <div className="avatar avatar-sm bg-tertiary member-avatar">
            {member.user.email[0].toUpperCase()}
          </div>
          <div className="member-info">
            <p
              className="member-name"
              style={{ color: roleColor }}
            >
              {member.user.email}
              {isCurrentUser && " (You)"}
            </p>
          </div>

          {/* Chevron (only if has actions) */}
          {hasActions && (
            <div className={`member-chevron ${isExpanded ? "expanded" : ""}`}>
              ▼
            </div>
          )}
        </div>

        {/* Expandable Actions Row */}
        {hasActions && isExpanded && (
          <div className="member-actions">
            {/* Role Management (Owner only, or debug mode) */}
            {showManageRole && (
              <div className="flex-1">
                {isUpdating ? (
                  <span className="text-xs text-secondary">Updating role...</span>
                ) : (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleRoleChange(member.id, e.target.value as MemberRole);
                      }}
                      className="member-role-select"
                      title={isDebug && !canManageRole ? "Debug: Unauthorized role change (will fail)" : "Change member role"}
                    >
                      {isDebug && <option value="OWNER">Owner</option>}
                      <option value="MODERATOR">Moderator</option>
                      <option value="GUEST">Guest</option>
                    </select>
                  </>
                )}
              </div>
            )}

            {/* Kick Button (Owner/Moderator, or debug mode) */}
            {showKick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleKickMember(member);
                }}
                disabled={isKicking || isUpdating}
                className="member-kick-btn"
                title={isDebug && !canKick ? "Debug: Unauthorized kick (will fail)" : "Kick member from server"}
              >
                {isKicking ? "Kicking..." : "Kick Member"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="members-sidebar">
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
