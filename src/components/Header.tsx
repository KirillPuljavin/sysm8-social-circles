import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function Header() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  return (
    <header className="bg-secondary border-b border-accent">
      <div className="container flex items-center justify-between p-md">
        <Link href="/" className="text-xl font-bold text-accent">
          TheCord
        </Link>

        <div className="flex items-center gap-md">
          {user ? (
            <>
              <Link href="/servers" className="text-sm text-primary hover:text-accent">
                Servers
              </Link>
              <span className="text-sm text-secondary">{user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <a href="/.auth/login/google?post_login_redirect_uri=/&prompt=select_account" className="btn btn-sm">
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
