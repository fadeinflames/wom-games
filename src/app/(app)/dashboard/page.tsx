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
    <div className="space-y-6">
      <section className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Control deck</p>
          <h1 className="font-[var(--font-display)] text-3xl font-bold">Мои game packs</h1>
          <p className="text-sm text-zinc-400">Создавай наборы, публикуй в галерею и запускай игры в двух режимах.</p>
        </div>
        <Link href="/packs/new" className="btn btn-primary">Новый pack</Link>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {packs.map((pack) => (
          <article key={pack.id} className="card space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              {pack.isPublic ? "Public" : "Private"} · {pack._count.scenarios} сценариев
            </p>
            <h2 className="font-[var(--font-display)] text-2xl font-bold">{pack.title}</h2>
            <p className="text-sm text-zinc-300">{pack.description}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Link href={`/packs/${pack.id}`} className="btn">Открыть</Link>
              <Link href={`/packs/${pack.id}/run`} className="btn">Режим ведущего</Link>
              <Link href={`/packs/${pack.id}/play`} className="btn">Режим игрока</Link>
            </div>
          </article>
        ))}
        {!packs.length ? (
          <div className="card text-sm text-zinc-400">Пока нет ни одного pack. Создай первый.</div>
        ) : null}
      </section>
    </div>
  );
}
