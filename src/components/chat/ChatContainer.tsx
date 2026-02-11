"use client";

import { useState, useRef, useCallback } from "react";
import { MemberRole } from "@prisma/client";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

export type MessageStatus = "PENDING" | "SENT" | "FAILED";

export interface ClientMessage {
  id: string;
  clientId: string;
  content: string;
  sentAt: string;
  sequence: number;
  status: MessageStatus;
  serverId: string;
  member: {
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  createdAt?: string;
  error?: string;
  retryCount?: number;
}

interface ChatContainerProps {
  serverId: string;
  currentMember: {
    id: string;
    role: MemberRole;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  isRestricted: boolean;
}

export default function ChatContainer({
  serverId,
  currentMember,
  isRestricted,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const messageSequenceRef = useRef(0);

  // Add optimistic message and sync in background
  const sendMessage = useCallback(
    async (content: string) => {
      // Increment sequence
      messageSequenceRef.current += 1;
      const sequence = messageSequenceRef.current;

      const clientId = crypto.randomUUID();
      const sentAt = new Date().toISOString();

      const optimisticMessage: ClientMessage = {
        id: clientId, // Temporary ID
        clientId,
        content,
        sentAt,
        sequence,
        status: "PENDING",
        serverId,
        member: currentMember,
      };

      // Add to state instantly
      setMessages((prev) => [...prev, optimisticMessage]);

      // Background sync
      try {
        const res = await fetch(`/api/servers/${serverId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            clientId,
            content,
            sentAt,
            sequence,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send message");
        }

        const serverMessage = await res.json();

        // Update to SENT
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId
              ? { ...serverMessage, status: "SENT" as const }
              : m
          )
        );
      } catch (error) {
        // Mark as FAILED
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === clientId
              ? {
                  ...m,
                  status: "FAILED" as const,
                  error: error instanceof Error ? error.message : "Unknown error",
                }
              : m
          )
        );
      }
    },
    [serverId, currentMember]
  );

  // Retry failed message
  const retryMessage = useCallback(
    async (message: ClientMessage) => {
      // Update status back to PENDING
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === message.clientId
            ? {
                ...m,
                status: "PENDING" as const,
                error: undefined,
                retryCount: (m.retryCount || 0) + 1,
              }
            : m
        )
      );

      // Retry sync
      try {
        const res = await fetch(`/api/servers/${serverId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            clientId: message.clientId,
            content: message.content,
            sentAt: message.sentAt,
            sequence: message.sequence,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to send message");
        }

        const serverMessage = await res.json();

        // Update to SENT
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === message.clientId
              ? { ...serverMessage, status: "SENT" as const }
              : m
          )
        );
      } catch (error) {
        // Mark as FAILED again
        setMessages((prev) =>
          prev.map((m) =>
            m.clientId === message.clientId
              ? {
                  ...m,
                  status: "FAILED" as const,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                }
              : m
          )
        );
      }
    },
    [serverId]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <MessageList
          serverId={serverId}
          messages={messages}
          setMessages={setMessages}
          onRetry={retryMessage}
          lastReadMessageId={lastReadMessageId}
          setLastReadMessageId={setLastReadMessageId}
          currentMember={currentMember}
        />
      </div>

      <div
        style={{
          padding: "var(--space-lg)",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-bg-secondary)",
          flexShrink: 0,
        }}
      >
        <MessageInput
          userRole={currentMember.role}
          isRestricted={isRestricted}
          onSendMessage={sendMessage}
        />
      </div>
    </div>
  );
}
