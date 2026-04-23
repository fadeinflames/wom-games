import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function GalleryPage() {
  const packs = await prisma.gamePack.findMany({
    where: { isPublic: true },
    include: { owner: true, _count: { select: { scenarios: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="card space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">Community feed</p>
        <h1 className="font-[var(--font-display)] text-3xl font-bold">Галерея сообщества</h1>
        <p className="text-sm text-zinc-400">
          Публичные наборы сценариев. Можно смотреть, учиться и вдохновляться.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {packs.map((pack) => (
          <article key={pack.id} className="card space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              by @{pack.owner.username} · {pack._count.scenarios} сценариев
            </p>
            <h2 className="font-[var(--font-display)] text-2xl font-bold">{pack.title}</h2>
            <p className="text-sm text-zinc-300">{pack.description}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href={`/packs/${pack.id}`} className="btn">Открыть pack</Link>
              <Link href={`/packs/${pack.id}/play`} className="btn">Играть</Link>
            </div>
          </article>
        ))}
        {!packs.length ? <div className="card text-sm text-zinc-400">Пока пусто. Будь первым, кто опубликует pack.</div> : null}
      </section>
    </div>
  );
}
