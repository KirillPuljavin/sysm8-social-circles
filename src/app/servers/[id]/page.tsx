import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerMember } from "@/lib/rbac";
import ChatContainer from "@/components/chat/ChatContainer";
import MembersList from "@/components/chat/MembersList";
import Link from "next/link";

interface ServerChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ServerChatPage({ params }: ServerChatPageProps) {
  const { id: serverId } = await params;
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  if (!user) {
    redirect(`/.auth/login/google?post_login_redirect_uri=/servers/${serverId}`);
  }

  // Check membership
  const member = await getServerMember(user.id, serverId);
  if (!member) {
    return (
      <div className="container p-xl">
        <div className="card text-center p-2xl" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="text-6xl mb-lg">🚫</div>
          <h1 className="text-3xl font-bold mb-md">Access Denied</h1>
          <p className="text-secondary mb-xl">
            You are not a member of this server. Please ask for an invite link.
          </p>
          <Link href="/servers" className="btn">
            Back to Servers
          </Link>
        </div>
      </div>
    );
  }

  // Fetch server details
  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { role: "asc" }, // OWNER first
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!server) {
    return (
      <div className="container p-xl">
        <div className="card text-center p-2xl" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="text-6xl mb-lg">❓</div>
          <h1 className="text-3xl font-bold mb-md">Server Not Found</h1>
          <p className="text-secondary mb-xl">
            This server does not exist or has been deleted.
          </p>
          <Link href="/servers" className="btn">
            Back to Servers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="server-chat-page">
      {/* Main Chat Area */}
      <div className="chat-main-area">
        <ChatContainer
          serverId={serverId}
          currentMember={{
            id: member.id,
            role: member.role,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
            },
          }}
          isRestricted={server.isRestricted}
        />
      </div>

      {/* Sidebar: Server Info + Members */}
      <div className="chat-sidebar">
        {/* Server Info Header */}
        <div className="server-info-header">
          <h1 className="server-info-title">{server.name}</h1>
          <p className="server-info-meta">
            {server.members.length} members
            {server.isRestricted && " • Restricted"}
          </p>
          <Link href="/servers" className="back-button" style={{ marginTop: "var(--space-md)" }}>
            ← Back
          </Link>
        </div>

        {/* Members List */}
        <MembersList
          members={server.members}
          currentUserId={user.id}
          currentUserRole={member.role}
          serverId={serverId}
        />
      </div>
    </div>
  );
}
