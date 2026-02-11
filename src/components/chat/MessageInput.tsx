"use client";

import { useState } from "react";
import { MemberRole } from "@prisma/client";

interface MessageInputProps {
  serverId: string;
  userRole: MemberRole;
  isRestricted: boolean;
}

export default function MessageInput({
  serverId,
  userRole,
  isRestricted,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user can post
  const canPost = !isRestricted || userRole !== MemberRole.GUEST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;
    if (!canPost) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/servers/${serverId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send message");
      }

      // Clear input on success
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const formEvent = e as unknown as React.FormEvent;
      void handleSubmit(formEvent);
    }
  };

  if (!canPost) {
    return (
      <div className="alert alert-warning">
        <p className="text-sm" style={{ margin: 0 }}>
          🔒 This is a restricted server. Only Owners and Moderators can post messages.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-error mb-md" style={{ padding: "var(--space-sm) var(--space-md)" }}>
          <p className="text-sm" style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      <div className="flex gap-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          disabled={sending}
          maxLength={2000}
          style={{
            flex: 1,
            minHeight: "60px",
            maxHeight: "150px",
            resize: "vertical",
          }}
        />
        <button
          type="submit"
          className="btn"
          disabled={sending || !content.trim()}
          style={{ alignSelf: "flex-end" }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
      <p className="text-xs text-tertiary" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
        {content.length}/2000 characters
      </p>
    </form>
  );
}
