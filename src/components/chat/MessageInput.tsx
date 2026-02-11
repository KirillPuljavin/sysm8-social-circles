"use client";

import { useState } from "react";
import { MemberRole } from "@prisma/client";

interface MessageInputProps {
  userRole: MemberRole;
  isRestricted: boolean;
  onSendMessage: (content: string) => Promise<void>;
}

export default function MessageInput({
  userRole,
  isRestricted,
  onSendMessage,
}: MessageInputProps) {
  const [content, setContent] = useState("");

  // Check if user can post
  const canPost = !isRestricted || userRole !== MemberRole.GUEST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;
    if (!canPost) return;

    // Send message (optimistic - doesn't wait)
    void onSendMessage(content.trim());

    // Clear input immediately
    setContent("");
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
      <div className="flex gap-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
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
          disabled={!content.trim()}
          style={{ alignSelf: "flex-end" }}
        >
          Send
        </button>
      </div>
      <p className="text-xs text-tertiary" style={{ marginTop: "var(--space-sm)", marginBottom: 0 }}>
        {content.length}/2000 characters
      </p>
    </form>
  );
}
