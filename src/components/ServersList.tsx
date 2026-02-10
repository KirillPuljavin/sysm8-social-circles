"use client";

// Server Management Component
// Full CRUD: Create, Toggle Restriction, Delete

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createRestricted, setCreateRestricted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Server
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          isRestricted: createRestricted,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create server");
      }

      // Reset form and close modal
      setCreateName("");
      setCreateRestricted(false);
      setShowCreateModal(false);

      // Refresh page to show new server
      router.refresh();
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
        /* Server Grid */
        <div className="grid grid-cols-2 gap-lg">
          {servers.map((server) => (
            <div key={server.id} className="card">
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
              {server.role === "OWNER" && (
                <div className="flex items-center gap-sm mb-md p-md bg-secondary rounded-lg">
                  <label className="flex items-center gap-sm flex-1">
                    <input
                      type="checkbox"
                      checked={server.isRestricted}
                      onChange={() =>
                        handleToggleRestriction(server.id, server.isRestricted)
                      }
                      disabled={loading}
                    />
                    <span className="text-sm">Restricted (Guests cannot post)</span>
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-sm">
                <button className="btn flex-1">Open</button>
                {server.role === "OWNER" && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(server.id, server.name)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-primary flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000 }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "500px", width: "90%" }}
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
