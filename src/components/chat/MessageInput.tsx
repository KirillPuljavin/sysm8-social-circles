"use client";

import { useState } from "react";
import { MemberRole } from "@prisma/client";
import { useDebug } from "@/contexts/DebugContext";

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
  const { isDebug } = useDebug();

  // Check if user can post
  const canPost = !isRestricted || userRole !== MemberRole.GUEST;

  // In debug mode, always show input even if user can't post
  const shouldShowInput = canPost || isDebug;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    // In debug mode, allow submission even if user can't post (to test API rejection)
    if (!canPost && !isDebug) return;

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

  if (!shouldShowInput) {
    return (
      <div className="alert alert-warning">
        <p className="text-sm" style={{ margin: 0 }}>
          🔒 This is a restricted server. Only Owners and Moderators can post messages.
        </p>
      </div>
    );
  }

  return (
    <>
      {!canPost && isDebug && (
        <div className="alert alert-info" style={{ marginBottom: "var(--space-sm)" }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Debug Mode: You are a GUEST in a restricted server. Posting will fail with 403.
          </p>
        </div>
      )}
    <form onSubmit={handleSubmit} className="message-input-form">
      <div className="flex gap-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={2000}
          className="message-input-field"
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
    </form>
    </>
  );
}
