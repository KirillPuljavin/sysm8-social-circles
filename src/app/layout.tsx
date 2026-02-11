import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/theme.scss";
import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";
import AuthCleanupGuard from "@/components/auth/AuthCleanupGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TheCord - Social Circles",
  description: "Connect with your circles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`} style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AuthCleanupGuard />
        <Header />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-primary)' }}>
          {children}
        </main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
