import type { Metadata } from "next";
import Link from "next/link";
import { Geist_Mono, Rubik } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { AppNav } from "@/components/app-nav";

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
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[oklch(10.5%_0.018_210_/_0.82)] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="min-w-0 font-[var(--font-display)] text-lg font-black tracking-wide text-amber-300 transition hover:text-amber-200">
              <span className="sm:hidden">WOM</span>
              <span className="hidden sm:inline">WHEEL OF MISFORTUNE</span>
            </Link>
            <AppNav username={user?.username ?? null} />
          </div>
        </header>
        <main id="main-content" className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 md:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
