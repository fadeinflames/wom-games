import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function GalleryPage() {
  const packs = await prisma.gamePack.findMany({
    where: { isPublic: true },
    include: { owner: true, _count: { select: { scenarios: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <section className="border-b border-white/10 pb-6">
        <p className="kicker">Community feed</p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl font-black">Галерея сообщества</h1>
        <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-zinc-400">
          Публичные наборы сценариев. Можно смотреть, учиться и вдохновляться.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {packs.length ? (
          packs.map((pack) => (
            <article key={pack.id} className="panel-strong flex min-h-60 flex-col justify-between gap-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-pill border-emerald-400/40 text-emerald-300">public</span>
                  <span className="font-mono text-xs text-zinc-500">@{pack.owner.username}</span>
                  <span className="font-mono text-xs text-zinc-500">{pack._count.scenarios} сценариев</span>
                </div>
                <h2 className="mt-4 font-[var(--font-display)] text-2xl font-bold">{pack.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{pack.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/packs/${pack.id}`} className="btn">Открыть</Link>
                <Link href={`/packs/${pack.id}/play`} className="btn btn-primary">Играть</Link>
              </div>
            </article>
          ))
        ) : (
          <div className="panel-strong md:col-span-2">
            <p className="kicker">Empty gallery</p>
            <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">Публичных паков пока нет</h2>
            <p className="mt-1 text-sm text-zinc-500">Опубликуй свой набор из dashboard, чтобы он появился здесь.</p>
          </div>
        )}
      </section>
    </div>
  );
}
