// Global Header Component
// Brand left, auth state + logout right

import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import Link from "next/link";

export default async function Header() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  return (
    <header className="bg-secondary border-b border-accent">
      <div className="container flex items-center justify-between p-md">
        {/* Brand */}
        <Link href="/" className="text-xl font-bold text-accent">
          TheCord
        </Link>

        {/* Auth State */}
        <div className="flex items-center gap-md">
          {user ? (
            <>
              <Link href="/servers" className="text-sm text-primary hover:text-accent">
                Servers
              </Link>
              <span className="text-sm text-secondary">{user.email}</span>
              <a
                href="/.auth/logout?post_logout_redirect_uri=/"
                className="btn btn-ghost btn-sm"
              >
                Logout
              </a>
            </>
          ) : (
            <a href="/.auth/login/github" className="btn btn-sm">
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
