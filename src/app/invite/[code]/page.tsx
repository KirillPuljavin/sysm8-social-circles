import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MemberRole } from "@prisma/client";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  if (!user) {
    redirect(`/.auth/login/google?post_login_redirect_uri=/invite/${code}`);
  }

  const server = await prisma.server.findUnique({
    where: { inviteCode: code },
    include: {
      members: {
        where: { userId: user.id },
      },
      _count: {
        select: { members: true },
      },
    },
  });

  // Invalid invite code
  if (!server) {
    return (
      <main className="container p-xl">
        <div className="card text-center p-2xl" style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="text-6xl mb-lg">❌</div>
          <h1 className="text-3xl font-bold mb-md">Invalid Invite</h1>
          <p className="text-secondary mb-xl">
            This invite link is invalid or has expired. Please ask the server owner for a new invite.
          </p>
          <a href="/servers" className="btn">
            Back to Servers
          </a>
        </div>
      </main>
    );
  }

  // Already a member - redirect to server chat
  if (server.members.length > 0) {
    redirect(`/servers/${server.id}`);
  }

  // Join server as GUEST
  await prisma.member.create({
    data: {
      userId: user.id,
      serverId: server.id,
      role: MemberRole.GUEST,
    },
  });

  // Success - redirect to server chat
  redirect(`/servers/${server.id}`);
}
