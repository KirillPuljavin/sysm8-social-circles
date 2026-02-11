'use client';

export default function LogoutButton({ className = "btn btn-ghost btn-sm" }: { className?: string }) {
  const handleLogout = () => {
    const authCookiePatterns = [
      'StaticWebAppsAuth',
      'AppServiceAuth',
      'x-ms-client-principal',
      '.AspNetCore.Cookies',
      'ARRAffinity',
    ];

    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      const isAuthCookie = authCookiePatterns.some(pattern => name.includes(pattern));

      if (isAuthCookie) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;

        const parts = window.location.hostname.split('.');
        if (parts.length > 2) {
          const parentDomain = '.' + parts.slice(-2).join('.');
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain}`;
        }
      }
    });

    try {
      ['azure-swa-auth', 'msal-cache', 'auth-redirect'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    } catch {
      // Storage unavailable
    }
    window.location.href = '/.auth/logout?post_logout_redirect_uri=/';
  };

  return (
    <button onClick={handleLogout} className={className}>
      Logout
    </button>
  );
}
