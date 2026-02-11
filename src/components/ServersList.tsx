"use client";

import { useState } from "react";
import { createServerSchema } from "@/lib/validations/server";

interface Server {
  id: string;
  name: string;
  inviteCode: string;
  isRestricted: boolean;
  memberCount: number;
  role: string;
}

interface ServersListProps {
  initialServers: Server[];
}

export default function ServersList({ initialServers }: ServersListProps) {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRestricted, setCreateRestricted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = createServerSchema.safeParse({
      name: createName,
      isRestricted: createRestricted,
    });

    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: createName,
          isRestricted: createRestricted,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create server");
      }

      const newServer = await res.json();

      // Add new server to local state
      setServers((prev) => [
        ...prev,
        {
          id: newServer.id,
          name: newServer.name,
          inviteCode: newServer.inviteCode,
          isRestricted: newServer.isRestricted,
          memberCount: newServer.members.length,
          role: "OWNER",
        },
      ]);

      // Reset form and close modal
      setCreateName("");
      setCreateRestricted(false);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Toggle isRestricted
  const handleToggleRestriction = async (serverId: string, currentValue: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isRestricted: !currentValue }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update server");
      }

      // Update local state
      setServers((prev) =>
        prev.map((s) =>
          s.id === serverId ? { ...s, isRestricted: !currentValue } : s
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update server");
    } finally {
      setLoading(false);
    }
  };

  // Delete Server
  const handleDelete = async (serverId: string, serverName: string) => {
    if (!confirm(`Delete "${serverName}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete server");
      }

      // Remove from local state
      setServers((prev) => prev.filter((s) => s.id !== serverId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete server");
    } finally {
      setLoading(false);
    }
  };

  // Copy Invite Link
  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopiedInvite(inviteCode);
      setTimeout(() => setCopiedInvite(null), 2000);
    });
  };

  // Separate owned and joined servers
  const ownedServers = servers.filter((s) => s.role === "OWNER");
  const joinedServers = servers.filter((s) => s.role !== "OWNER");

  // Server Card Component
  const ServerCard = ({
    server,
    isOwner,
    loading,
    onToggleRestriction,
    onDelete,
    onCopyInvite,
    copied,
  }: {
    server: Server;
    isOwner: boolean;
    loading: boolean;
    onToggleRestriction: (serverId: string, currentValue: boolean) => void;
    onDelete: (serverId: string, serverName: string) => void;
    onCopyInvite: (inviteCode: string) => void;
    copied: boolean;
  }) => (
    <div className="card">
      {/* Server Info */}
      <div className="flex items-start gap-md mb-md">
        <div
          className="avatar bg-accent text-2xl"
          style={{ width: "64px", height: "64px" }}
        >
          {server.name[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-sm">{server.name}</h3>
          <p className="text-sm text-secondary mb-sm">
            {server.memberCount} members
          </p>
          <span className="badge">{server.role}</span>
        </div>
      </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="flex items-center gap-sm mb-md p-md bg-secondary rounded-lg">
          <label className="flex items-center gap-sm flex-1">
            <input
              type="checkbox"
              checked={server.isRestricted}
              onChange={() => onToggleRestriction(server.id, server.isRestricted)}
              disabled={loading}
            />
            <span className="text-sm">Restricted (Guests cannot post)</span>
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-sm">
        <a href={`/servers/${server.id}`} className="btn flex-1">Open</a>
        <button
          className="btn"
          onClick={() => onCopyInvite(server.inviteCode)}
          disabled={loading}
          title="Copy invite link to clipboard"
        >
          {copied ? "✓ Copied" : "Invite"}
        </button>
        {isOwner && (
          <button
            className="btn btn-danger"
            onClick={() => onDelete(server.id, server.name)}
            disabled={loading}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-xl">
        <div>
          <h1 className="text-3xl font-bold mb-sm">Your Servers</h1>
          <p className="text-secondary">
            Manage and access your server communities
          </p>
        </div>
        <button
          className="btn"
          onClick={() => setShowCreateModal(true)}
          disabled={loading}
        >
          Create Server
        </button>
      </div>

      {/* Empty State */}
      {servers.length === 0 ? (
        <div className="card text-center p-2xl">
          <div className="text-4xl mb-md">🌐</div>
          <h2 className="text-2xl font-bold mb-md">No Servers Yet</h2>
          <p className="text-secondary mb-lg">
            Create your first server to start connecting with your team.
          </p>
          <button
            className="btn"
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
          >
            Create Your First Server
          </button>
        </div>
      ) : (
        <>
          {/* My Servers (Owned) */}
          {ownedServers.length > 0 && (
            <div className="mb-2xl">
              <h2 className="text-xl font-bold mb-lg">My Servers</h2>
              <div className="grid grid-cols-2 gap-lg">
                {ownedServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    isOwner={true}
                    loading={loading}
                    onToggleRestriction={handleToggleRestriction}
                    onDelete={handleDelete}
                    onCopyInvite={copyInviteLink}
                    copied={copiedInvite === server.inviteCode}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Joined Servers (Member/Moderator) */}
          {joinedServers.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-lg">Joined Servers</h2>
              <div className="grid grid-cols-2 gap-lg">
                {joinedServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    isOwner={false}
                    loading={loading}
                    onToggleRestriction={handleToggleRestriction}
                    onDelete={handleDelete}
                    onCopyInvite={copyInviteLink}
                    copied={copiedInvite === server.inviteCode}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="modal card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-lg">Create Server</h2>

            {error && (
              <div className="alert alert-error mb-md">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <div className="mb-md">
                <label className="text-sm font-semibold mb-sm block">
                  Server Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="My Awesome Server"
                  required
                  maxLength={100}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="mb-lg">
                <label className="flex items-center gap-sm">
                  <input
                    type="checkbox"
                    checked={createRestricted}
                    onChange={(e) => setCreateRestricted(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="text-sm">
                    Restricted server (guests cannot post)
                  </span>
                </label>
              </div>

              <div className="flex gap-sm">
                <button
                  type="button"
                  className="btn btn-ghost flex-1"
                  onClick={() => setShowCreateModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn flex-1"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
