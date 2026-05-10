import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/theme.scss";
import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";
import AuthCleanupGuard from "@/components/auth/AuthCleanupGuard";
import { DebugProvider } from "@/contexts/DebugContext";
import { ClerkProvider } from "@clerk/nextjs";

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
      <body className={`${geistSans.variable} ${geistMono.variable} layout-body`}>
        <ClerkProvider>
        <DebugProvider>
          <AuthCleanupGuard />
          <Header />
          <main className="layout-main">
            {children}
          </main>
          <ConditionalFooter />
        </DebugProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
