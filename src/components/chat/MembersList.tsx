"use client";

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
}

export default function MembersList({ members, currentUserId }: MembersListProps) {
  // Group members by role
  const owners = members.filter((m) => m.role === MemberRole.OWNER);
  const moderators = members.filter((m) => m.role === MemberRole.MODERATOR);
  const guests = members.filter((m) => m.role === MemberRole.GUEST);

  const renderMember = (member: Member) => {
    const displayName = member.user.name || member.user.email;
    const isCurrentUser = member.user.id === currentUserId;
    const roleColor =
      member.role === MemberRole.OWNER
        ? "var(--color-accent-blue)"
        : member.role === MemberRole.MODERATOR
        ? "var(--color-warning)"
        : "var(--color-text-secondary)";

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
