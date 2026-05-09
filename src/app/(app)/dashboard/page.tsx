import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  const packs = await prisma.gamePack.findMany({
    where: { ownerId: user.id },
    include: { _count: { select: { scenarios: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <p className="kicker text-emerald-300">Control deck</p>
          <h1 className="mt-2 font-[var(--font-display)] text-4xl font-black">Мои паки сценариев</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Создавай наборы, публикуй в галерею и запускай тренировки для ведущего или игрока.
          </p>
        </div>
        <Link href="/packs/new" className="btn btn-primary">Новый пак</Link>
      </section>

      <section className="space-y-3">
        {packs.length ? (
          packs.map((pack) => (
            <article key={pack.id} className="panel-strong">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`status-pill ${pack.isPublic ? "border-emerald-400/40 text-emerald-300" : "text-zinc-500"}`}>
                      {pack.isPublic ? "public" : "private"}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{pack._count.scenarios} сценариев</span>
                  </div>
                  <h2 className="mt-3 font-[var(--font-display)] text-2xl font-bold">{pack.title}</h2>
                  <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-zinc-400">{pack.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/packs/${pack.id}`} className="btn">Настроить</Link>
                  <Link href={`/packs/${pack.id}/run`} className="btn btn-primary">Вести</Link>
                  <Link href={`/packs/${pack.id}/play`} className="btn">Играть</Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="panel-strong flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="kicker">Empty deck</p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl font-bold">Пока нет ни одного пака</h2>
              <p className="mt-1 text-sm text-zinc-500">Создай первый набор и добавь несколько инцидентов для тренировки.</p>
            </div>
            <Link href="/packs/new" className="btn btn-primary">Создать пак</Link>
          </div>
        )}
      </section>
    </div>
  );
}
