// Servers Page - Protected Route
// List and manage user's servers

import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ServersPage() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  // Middleware should catch this, but double-check
  if (!user) {
    redirect("/");
  }

  // Fetch user's servers (via membership)
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

  return (
    <main className="container p-xl">
      <div className="flex items-center justify-between mb-xl">
        <div>
          <h1 className="text-3xl font-bold mb-sm">Your Servers</h1>
          <p className="text-secondary">
            Manage and access your server communities
          </p>
        </div>
        <button className="btn">Create Server</button>
      </div>

      {memberships.length === 0 ? (
        <div className="card text-center p-2xl">
          <div className="text-4xl mb-md">🌐</div>
          <h2 className="text-2xl font-bold mb-md">No Servers Yet</h2>
          <p className="text-secondary mb-lg">
            Create your first server to start connecting with your team.
          </p>
          <button className="btn">Create Your First Server</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-lg">
          {memberships.map((membership) => (
            <div key={membership.id} className="card">
              <div className="flex items-start gap-md mb-md">
                <div
                  className="avatar bg-accent text-2xl"
                  style={{ width: "64px", height: "64px" }}
                >
                  {membership.server.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-sm">
                    {membership.server.name}
                  </h3>
                  <p className="text-sm text-secondary mb-sm">
                    {membership.server._count.members} members
                  </p>
                  <span className="badge">{membership.role}</span>
                </div>
              </div>
              <div className="flex gap-sm">
                <button className="btn flex-1">Open</button>
                {membership.role === "OWNER" && (
                  <button className="btn btn-ghost">Settings</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
