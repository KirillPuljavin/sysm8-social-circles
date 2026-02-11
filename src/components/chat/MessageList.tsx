"use client";

import { useEffect, useState, useRef } from "react";

interface Message {
  id: string;
  content: string;
  createdAt: string;
  member: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
}

interface MessageListProps {
  serverId: string;
}

export default function MessageList({ serverId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    void fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Auto-refresh every 3 seconds (simple polling)
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchMessages();
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-secondary">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-xl">
          <p className="text-error mb-md">{error}</p>
          <button onClick={fetchMessages} className="btn btn-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "var(--space-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-md)",
      }}
    >
      {messages.map((message) => {
        const displayName = message.member.user.name || message.member.user.email;
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
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
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
  );
}
