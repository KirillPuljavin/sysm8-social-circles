import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GdprActions from "@/components/settings/GdprActions";

export default async function SettingsPage() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  if (!user) {
    redirect("/.auth/login/google?post_login_redirect_uri=/settings");
  }

  // Fetch user data for display
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberships: {
        include: {
          server: true,
        },
      },
      servers: true,
    },
  });

  if (!userData) {
    redirect("/");
  }

  return (
    <div className="container p-xl" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1 className="text-4xl font-bold mb-lg">Account Settings</h1>

      {/* Profile Section */}
      <div className="card mb-xl">
        <h2 className="text-2xl font-semibold mb-md">Profile Information</h2>
        <div className="flex flex-col gap-md">
          <div>
            <label className="text-sm text-secondary">Name</label>
            <p className="text-lg">{userData.name || "Not set"}</p>
          </div>
          <div>
            <label className="text-sm text-secondary">Email</label>
            <p className="text-lg">{userData.email}</p>
          </div>
          <div>
            <label className="text-sm text-secondary">Member Since</label>
            <p className="text-lg">{new Date(userData.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="card mb-xl">
        <h2 className="text-2xl font-semibold mb-md">Activity Summary</h2>
        <div className="flex flex-col gap-sm">
          <p className="text-base">
            <strong>Servers Owned:</strong> {userData.servers.length}
          </p>
          <p className="text-base">
            <strong>Server Memberships:</strong> {userData.memberships.length}
          </p>
        </div>
      </div>

      {/* GDPR Section */}
      <div className="card">
        <h2 className="text-2xl font-semibold mb-md text-error">Data & Privacy</h2>
        <p className="text-secondary mb-lg">
          Under GDPR, you have the right to access and delete your personal data.
        </p>
        <GdprActions />
      </div>
    </div>
  );
}
