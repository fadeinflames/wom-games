import type { Metadata } from "next";
import Link from "next/link";
import { Geist_Mono, Rubik } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

// Rubik supports both Latin and Cyrillic — unlike Space Grotesk which is Latin-only.
const display = Rubik({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wheel of Misfortune Platform",
  description: "Open-source платформа для SRE incident games",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${display.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <header className="border-b border-white/10 bg-black/60 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-[var(--font-display)] text-lg font-bold tracking-wide text-amber-400">
              WHEEL OF MISFORTUNE
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-300">
              <Link href="/gallery" className="hover:text-white">Галерея</Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="hover:text-white">Мои игры</Link>
                  <span className="rounded border border-white/20 px-2 py-1 text-xs">{user.username}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-white">Войти</Link>
                  <Link href="/register" className="rounded bg-amber-500 px-3 py-1 text-black hover:bg-amber-400">Регистрация</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
