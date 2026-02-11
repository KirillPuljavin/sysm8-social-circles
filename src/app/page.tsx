import { headers } from "next/headers";
import { getAuthenticatedUser } from "@/lib/auth";
import LoginButton from "@/components/auth/LoginButton";
import Link from "next/link";

export default async function Home() {
  const headersList = await headers();
  const user = await getAuthenticatedUser(headersList);

  return (
    <main>
      <section className="flex flex-col items-center justify-center text-center p-2xl" style={{ minHeight: '80vh' }}>
        <div style={{ maxWidth: '800px' }}>
          <h1 className="text-4xl font-bold mb-md">
            Connect with Your Circles
          </h1>
          <p className="text-xl text-secondary mb-xl">
            TheCord brings teams together with secure, organized communication.
            Create private servers, invite members, and collaborate with confidence.
          </p>
          {user ? (
            <Link href="/servers" className="btn btn-primary">
              Continue to Servers →
            </Link>
          ) : (
            <LoginButton />
          )}
        </div>
      </section>

      <section className="bg-secondary p-2xl">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-xl">
            Enterprise-Grade Communication
          </h2>
          <div className="grid grid-cols-3 gap-xl">
            <div className="card text-center">
              <div className="text-4xl mb-md">🔒</div>
              <h3 className="text-xl font-semibold mb-md">Secure by Default</h3>
              <p className="text-secondary">
                Role-based access control, encrypted connections, and GDPR compliance built in.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-md">⚡</div>
              <h3 className="text-xl font-semibold mb-md">Lightning Fast</h3>
              <p className="text-secondary">
                Cloud-native architecture deployed on Azure with global CDN distribution.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-md">🎯</div>
              <h3 className="text-xl font-semibold mb-md">Team Focused</h3>
              <p className="text-secondary">
                Organize conversations by server, manage roles, and keep your team aligned.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center text-center p-2xl">
        <div style={{ maxWidth: '600px' }}>
          <h2 className="text-3xl font-bold mb-md">Ready to Get Started?</h2>
          <p className="text-secondary mb-xl">
            Join thousands of teams already using TheCord for secure collaboration.
          </p>
          <LoginButton />
        </div>
      </section>
    </main>
  );
}
