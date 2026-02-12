"use client";

import { useEffect, useRef, Dispatch, SetStateAction, useState } from "react";
import { MemberRole } from "@prisma/client";
import type { ClientMessage } from "./ChatContainer";
import { useDebug } from "@/contexts/DebugContext";

interface MessageListProps {
  serverId: string;
  messages: ClientMessage[];
  setMessages: Dispatch<SetStateAction<ClientMessage[]>>;
  onRetry: (message: ClientMessage) => Promise<void>;
  lastReadMessageId: string | null;
  setLastReadMessageId: (id: string) => void;
  currentMember: {
    id: string;
    role: MemberRole;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

export default function MessageList({
  serverId,
  messages,
  setMessages,
  onRetry,
  lastReadMessageId,
  setLastReadMessageId,
  currentMember,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showNewMessagesPopup, setShowNewMessagesPopup] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const wasAtBottomRef = useRef(true);
  const { isDebug, logAction } = useDebug();

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

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Delete this message?")) {
      return;
    }

    setDeletingMessageId(messageId);
    try {
      const res = await fetch(`/api/servers/${serverId}/messages/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        // Log debug action for failed delete
        if (isDebug) {
          logAction("DELETE", `/api/servers/${serverId}/messages/${messageId}`, res.status, data.error || "Failed to delete message");
        }
        throw new Error(data.error || "Failed to delete message");
      }

      // Log debug action for successful delete
      if (isDebug) {
        logAction("DELETE", `/api/servers/${serverId}/messages/${messageId}`, res.status, "Message deleted");
      }

      // Remove from local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete message"
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) {
      setEditingMessageId(null);
      return;
    }

    try {
      const res = await fetch(`/api/servers/${serverId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Log debug action for failed edit
        if (isDebug) {
          logAction("PATCH", `/api/servers/${serverId}/messages/${messageId}`, res.status, data.error || "Failed to edit message");
        }
        throw new Error(data.error || "Failed to edit message");
      }

      // Log debug action for successful edit
      if (isDebug) {
        logAction("PATCH", `/api/servers/${serverId}/messages/${messageId}`, res.status, "Message edited");
      }

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: editContent } : m
        )
      );
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to edit message:", error);
      alert(error instanceof Error ? error.message : "Failed to edit message");
    }
  };

  const startEdit = (message: ClientMessage) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  // Initial fetch
  useEffect(() => {
    void fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMessages();
    }, 2000);
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
    <div className="relative h-full">
      <div ref={scrollContainerRef} className="message-list-container">
      {/* Top indicator */}
      {!hasMoreMessages && messages.length > 0 && (
        <div className="text-center p-md text-tertiary text-sm">
          You&apos;ve reached the top of this conversation
        </div>
      )}
      {loadingOlder && (
        <div className="text-center p-md text-secondary">
          Loading older messages...
        </div>
      )}

      {messages.map((message) => {
        const roleColor =
          message.member.role === "OWNER"
            ? "var(--color-accent-blue)"
            : message.member.role === "MODERATOR"
            ? "var(--color-warning)"
            : "var(--color-text-secondary)";

        // Delete permission logic (matches RBAC matrix)
        const isOwnMessage = message.member.user.id === currentMember.user.id;
        const isOwner = currentMember.role === MemberRole.OWNER;
        const isModerator = currentMember.role === MemberRole.MODERATOR;

        const canDelete =
          isOwnMessage || // Anyone can delete own messages
          (isOwner || isModerator) && message.member.role === "GUEST" || // Owner/Mod can delete guest messages
          (isOwner || isModerator) && message.member.role === "MODERATOR" || // Owner/Mod can delete mod messages
          isOwner && message.member.role === "OWNER"; // Only owner can delete owner messages

        // In debug mode, show delete button on all messages
        const showDeleteButton = canDelete || isDebug;

        const isDeleting = deletingMessageId === message.id;
        const isEditing = editingMessageId === message.id;

        return (
          <div
            key={message.id}
            className={`message-item ${isOwnMessage ? "message-own" : "message-other"}`}
            onMouseEnter={() => setHoveredMessageId(message.id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            {/* Action Buttons - Left side for own messages */}
            {isOwnMessage && message.status === "SENT" && hoveredMessageId === message.id && !isEditing && (
              <div className="message-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(message);
                  }}
                  className="message-edit-btn"
                  title="Edit message"
                >
                  ✏
                </button>
                {showDeleteButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(message.id);
                    }}
                    disabled={isDeleting}
                    className="message-delete-btn"
                    title={isDebug && !canDelete ? "Debug: Unauthorized delete (will fail)" : "Delete message"}
                  >
                    {isDeleting ? "..." : "×"}
                  </button>
                )}
              </div>
            )}

            <div className="avatar avatar-sm bg-tertiary message-avatar">
              {message.member.user.email[0].toUpperCase()}
            </div>
            <div className="message-content">
              <div className="message-header">
                <span className="message-author" style={{ color: roleColor }}>
                  {message.member.user.email}
                </span>
                <span className="message-timestamp">
                  {new Date(message.sentAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {/* Status indicator */}
                {message.status === "PENDING" && (
                  <span
                    className="text-xs text-tertiary"
                    title="Sending..."
                  >
                    ⏳
                  </span>
                )}
                {message.status === "SENT" && (
                  <span
                    className="text-xs text-accent"
                    title="Sent"
                  >
                    ✓
                  </span>
                )}
                {message.status === "FAILED" && (
                  <button
                    onClick={() => onRetry(message)}
                    className="text-xs underline text-error"
                    title={message.error || "Failed to send"}
                  >
                    ✗ Retry
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="message-edit-form">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="message-edit-textarea"
                    maxLength={2000}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleEditMessage(message.id);
                      }
                      if (e.key === "Escape") {
                        cancelEdit();
                      }
                    }}
                  />
                  <div className="message-edit-actions">
                    <button
                      onClick={() => handleEditMessage(message.id)}
                      className="btn btn-sm"
                      disabled={!editContent.trim()}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn btn-sm btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="message-text">
                  {message.content}
                </p>
              )}
            </div>

            {/* Delete Button - Right side for other messages */}
            {!isOwnMessage && showDeleteButton && message.status === "SENT" && hoveredMessageId === message.id && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMessage(message.id);
                }}
                disabled={isDeleting}
                className="message-delete-btn"
                title={isDebug && !canDelete ? "Debug: Unauthorized delete (will fail)" : "Delete message"}
              >
                {isDeleting ? "..." : "×"}
              </button>
            )}
          </div>
        );
      })}
        <div ref={messagesEndRef} />
      </div>

      {/* New messages popup */}
      {showNewMessagesPopup && unreadCount > 0 && (
        <button
          onClick={handleScrollToBottom}
          className="new-messages-popup"
        >
          {unreadCount} new message{unreadCount > 1 ? "s" : ""} ↓
        </button>
      )}
    </div>
  );
}
