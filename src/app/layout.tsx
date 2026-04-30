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
  metadataBase: new URL("https://web-production-d58c3.up.railway.app"),
  title: {
    default: "Wheel of Misfortune",
    template: "%s · Wheel of Misfortune",
  },
  description: "Open-source платформа для SRE incident games",
  openGraph: {
    title: "Wheel of Misfortune",
    description: "Open-source платформа для SRE incident games",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="ru"
      className={`${display.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">К содержимому</a>
        <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-[var(--font-display)] text-lg font-black tracking-wide text-amber-400 transition hover:text-amber-300">
              WHEEL OF MISFORTUNE
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-300">
              <Link href="/gallery" className="transition hover:text-white">Галерея</Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="transition hover:text-white">Мои игры</Link>
                  <span className="rounded border border-white/20 px-2 py-1 text-xs">{user.username}</span>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="transition hover:text-white">Войти</Link>
                  <Link href="/register" className="rounded-md bg-amber-500 px-3 py-1.5 text-black transition hover:bg-amber-400">Регистрация</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main id="main-content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
