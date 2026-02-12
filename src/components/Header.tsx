import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import DebugToggle from "@/components/DebugToggle";

export default async function Header() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-nav">
          <Link href="/" className="header-brand">
            TheCord
          </Link>
          {user && (
            <Link href="/servers" className="header-nav-link">
              Servers
            </Link>
          )}
        </div>

        <div className="header-auth">
          {user && <DebugToggle />}
          {user ? (
            <>
              <div className="header-user">{user.email}</div>
              <LogoutButton />
            </>
          ) : (
            <a
              href="/.auth/login/google?post_login_redirect_uri=/&prompt=select_account"
              className="btn btn-sm"
            >
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
