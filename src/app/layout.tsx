import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/theme.scss";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      <body className={`${geistSans.variable} ${geistMono.variable} flex flex-col`} style={{ minHeight: '100vh' }}>
        <AuthCleanupGuard />
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
