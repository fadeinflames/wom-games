"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";

function navClass(active: boolean) {
  return [
    "rounded-md px-2 py-1.5 text-sm transition",
    active
      ? "bg-white/[0.08] text-zinc-100"
      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
  ].join(" ");
}

export function AppNav({ username }: { username?: string | null }) {
  const pathname = usePathname();
  const isGallery = pathname.startsWith("/gallery");
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/packs");

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      <Link href="/gallery" className={navClass(isGallery)}>
        Галерея
      </Link>
      {username ? (
        <>
          <Link href="/dashboard" className={navClass(isDashboard)}>
            Мои игры
          </Link>
          <span className="hidden max-w-28 truncate rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-400 sm:inline">
            {username}
          </span>
          <LogoutButton />
        </>
      ) : (
        <>
          <Link href="/login" className={navClass(pathname.startsWith("/login"))}>
            Войти
          </Link>
          <Link href="/register" className="btn btn-primary min-h-8 px-3 py-1.5">
            Регистрация
          </Link>
        </>
      )}
    </nav>
  );
}
