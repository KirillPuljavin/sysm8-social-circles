import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ServersList from "@/components/ServersList";

export default async function ServersPage() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const memberships = await prisma.member.findMany({
    where: { userId: user.id },
    include: {
      server: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
  });

  const servers = memberships.map((m) => ({
    id: m.server.id,
    name: m.server.name,
    inviteCode: m.server.inviteCode,
    isRestricted: m.server.isRestricted,
    memberCount: m.server._count.members,
    role: m.role,
  }));

  return (
    <main className="container p-xl">
      <ServersList initialServers={servers} />
    </main>
  );
}
