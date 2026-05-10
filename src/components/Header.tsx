import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import Link from "next/link";
import DebugToggle from "@/components/DebugToggle";
import { SignInButton, Show, UserButton } from "@clerk/nextjs";

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
            <>
              <Link href="/servers" className="header-nav-link">
                Servers
              </Link>
              <Link href="/settings" className="header-nav-link">
                Settings
              </Link>
            </>
          )}
        </div>

        <div className="header-auth">
          {user && <DebugToggle />}
          {user && <div className="header-user">{user.email}</div>}
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="btn btn-sm">Login</button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
