"use client";

import { useEffect, useRef, Dispatch, SetStateAction, useState } from "react";
import type { ClientMessage } from "./ChatContainer";

interface MessageListProps {
  serverId: string;
  messages: ClientMessage[];
  setMessages: Dispatch<SetStateAction<ClientMessage[]>>;
  onRetry: (message: ClientMessage) => Promise<void>;
  lastReadMessageId: string | null;
  setLastReadMessageId: (id: string) => void;
}

export default function MessageList({
  serverId,
  messages,
  setMessages,
  onRetry,
  lastReadMessageId,
  setLastReadMessageId,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showNewMessagesPopup, setShowNewMessagesPopup] = useState(false);
  const wasAtBottomRef = useRef(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/servers/${serverId}/messages`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await res.json();
      const serverMessages: ClientMessage[] = data.messages || [];

      // Initial load: Check if we got less than 100 messages (no more to load)
      if (isInitialLoad) {
        setHasMoreMessages(serverMessages.length >= 100);
        setIsInitialLoad(false);
      }

      setMessages((prev) => {
        // Get pending/failed messages
        const localMessages = prev.filter(
          (m) => m.status === "PENDING" || m.status === "FAILED"
        );
        const localClientIds = new Set(localMessages.map((m) => m.clientId));

        // Filter server messages (exclude duplicates)
        const newServerMessages = serverMessages
          .filter((m) => !localClientIds.has(m.clientId))
          .map((m) => ({ ...m, status: "SENT" as const }));

        // Merge and sort
        const merged = [...localMessages, ...newServerMessages];

        return merged.sort((a, b) => {
          const timeA = new Date(a.sentAt).getTime();
          const timeB = new Date(b.sentAt).getTime();
          if (timeA !== timeB) return timeA - timeB;
          if (a.sequence !== b.sequence) return a.sequence - b.sequence;
          return a.clientId.localeCompare(b.clientId);
        });
      });
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages) return;

    // Get oldest message ID
    const oldestMessage = messages.find((m) => m.status === "SENT");
    if (!oldestMessage) return;

    setLoadingOlder(true);

    try {
      const res = await fetch(
        `/api/servers/${serverId}/messages?before=${oldestMessage.id}&limit=50`,
        { credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed to load older messages");

      const data = await res.json();
      const olderMessages: ClientMessage[] = data.messages || [];

      // If we got less than requested, no more messages exist
      if (olderMessages.length < 50) {
        setHasMoreMessages(false);
      }

      if (olderMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.clientId));
          const newMessages = olderMessages
            .filter((m) => !existingIds.has(m.clientId))
            .map((m) => ({ ...m, status: "SENT" as const }));

          return [...newMessages, ...prev].sort((a, b) => {
            const timeA = new Date(a.sentAt).getTime();
            const timeB = new Date(b.sentAt).getTime();
            if (timeA !== timeB) return timeA - timeB;
            if (a.sequence !== b.sequence) return a.sequence - b.sequence;
            return a.clientId.localeCompare(b.clientId);
          });
        });
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Check if user is at bottom
  const isUserAtBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight < 50
    );
  };

  // Track scroll position and mark messages as read
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = isUserAtBottom();
      wasAtBottomRef.current = atBottom;

      if (atBottom) {
        setShowNewMessagesPopup(false);
        // Mark latest message as read
        const latestMessage = messages[messages.length - 1];
        if (latestMessage && latestMessage.status === "SENT") {
          setLastReadMessageId(latestMessage.id);
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages, setLastReadMessageId]);

  // Scroll to bottom when messages update (only if user WAS at bottom)
  useEffect(() => {
    if (wasAtBottomRef.current || messages.length === 1) {
      scrollToBottom();
      // Mark as read
      const latestMessage = messages[messages.length - 1];
      if (latestMessage && latestMessage.status === "SENT") {
        setLastReadMessageId(latestMessage.id);
      }
    } else {
      // User is scrolled up, check for new messages
      const unreadCount = messages.filter((m) => {
        if (!lastReadMessageId || m.status !== "SENT") return false;
        const lastReadIndex = messages.findIndex(
          (msg) => msg.id === lastReadMessageId
        );
        const currentIndex = messages.indexOf(m);
        return currentIndex > lastReadIndex;
      }).length;

      if (unreadCount > 0) {
        setShowNewMessagesPopup(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Detect scroll to top for pagination
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && !loadingOlder && hasMoreMessages) {
        void loadOlderMessages();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOlder, hasMoreMessages, messages]);

  // Show loading state during initial fetch
  if (isInitialLoad && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-xl">
          <div className="text-4xl mb-md" style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
            💬
          </div>
          <p className="text-secondary">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Show empty state only after initial load completes
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-xl">
          <div className="text-6xl mb-md">💬</div>
          <h3 className="text-xl font-bold mb-sm">No Messages Yet</h3>
          <p className="text-secondary">
            Be the first to send a message in this server!
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => {
    if (!lastReadMessageId || m.status !== "SENT") return false;
    const lastReadIndex = messages.findIndex((msg) => msg.id === lastReadMessageId);
    const currentIndex = messages.indexOf(m);
    return currentIndex > lastReadIndex;
  }).length;

  const handleScrollToBottom = () => {
    scrollToBottom();
    setShowNewMessagesPopup(false);
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.status === "SENT") {
      setLastReadMessageId(latestMessage.id);
    }
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div
        ref={scrollContainerRef}
        style={{
          height: "100%",
          overflowY: "auto",
          padding: "var(--space-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
      {/* Top indicator */}
      {!hasMoreMessages && messages.length > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-md)",
            color: "var(--color-text-tertiary)",
            fontSize: "0.875rem",
          }}
        >
          📜 You&apos;ve reached the top of this conversation
        </div>
      )}
      {loadingOlder && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-md)",
            color: "var(--color-text-secondary)",
          }}
        >
          Loading older messages...
        </div>
      )}

      {messages.map((message) => {
        const displayName =
          message.member.user.name || message.member.user.email;
        const roleColor =
          message.member.role === "OWNER"
            ? "var(--color-accent-blue)"
            : message.member.role === "MODERATOR"
            ? "var(--color-warning)"
            : "var(--color-text-secondary)";

        return (
          <div key={message.id} className="flex gap-md">
            <div
              className="avatar avatar-sm bg-tertiary"
              style={{ flexShrink: 0 }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-sm mb-xs">
                <span className="font-semibold" style={{ color: roleColor }}>
                  {displayName}
                </span>
                <span className="text-xs text-tertiary">
                  {new Date(message.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {/* Status indicator */}
                {message.status === "PENDING" && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-tertiary)" }}
                    title="Sending..."
                  >
                    ⏳
                  </span>
                )}
                {message.status === "SENT" && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-accent-blue)" }}
                    title="Sent"
                  >
                    ✓
                  </span>
                )}
                {message.status === "FAILED" && (
                  <button
                    onClick={() => onRetry(message)}
                    className="text-xs underline"
                    style={{ color: "var(--color-error)" }}
                    title={message.error || "Failed to send"}
                  >
                    ✗ Retry
                  </button>
                )}
              </div>
              <p
                className="text-primary"
                style={{
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {message.content}
              </p>
            </div>
          </div>
        );
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages popup */}
      {showNewMessagesPopup && unreadCount > 0 && (
        <button
          onClick={handleScrollToBottom}
          style={{
            position: "absolute",
            bottom: "var(--space-lg)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "var(--space-sm) var(--space-lg)",
            background: "var(--color-accent-blue)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-full)",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 10,
          }}
        >
          {unreadCount} new message{unreadCount > 1 ? "s" : ""} ↓
        </button>
      )}
    </div>
  );
}
