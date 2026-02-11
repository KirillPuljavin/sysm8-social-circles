'use client';

import { useEffect } from 'react';

export default function AuthCleanupGuard() {
  useEffect(() => {
    const hasAuthCookie = document.cookie
      .split(';')
      .some((cookie) => {
        const name = cookie.trim().split('=')[0];
        return (
          name.includes('StaticWebAppsAuth') ||
          name.includes('AppServiceAuth') ||
          name === 'x-ms-client-principal'
        );
      });

    if (!hasAuthCookie) {
      const authCookiePatterns = [
        'StaticWebAppsAuth',
        'AppServiceAuth',
        'x-ms-client-principal',
        '.AspNetCore.Cookies',
        'ARRAffinity',
      ];

      const cookies = document.cookie.split(';');

      cookies.forEach((cookie) => {
        const name = cookie.trim().split('=')[0];
        const isAuthCookie = authCookiePatterns.some(pattern => name.includes(pattern));

        if (isAuthCookie) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;

          const parts = window.location.hostname.split('.');
          if (parts.length > 2) {
            const parentDomain = '.' + parts.slice(-2).join('.');
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain}`;
          }

          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
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
    }
  }, []);

  return null;
}
