import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaderConsole } from "@/components/leader-console-v2";

type Props = {
  params: Promise<{ packId: string }>;
};

export default async function RunPackPage({ params }: Props) {
  const { packId } = await params;
  const user = await requireUser();

  const pack = await prisma.gamePack.findUnique({
    where: { id: packId },
    include: {
      scenarios: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          summary: true,
          difficulty: true,
          durationMin: true,
          type: true,
          hintsJson: true,
          gmScriptJson: true,
          actionsJson: true,
          contextJson: true,
          eventsJson: true,
        },
      },
    },
  });

  if (!pack) {
    notFound();
  }
  if (!pack.isPublic && pack.ownerId !== user.id) {
    redirect(`/packs/${pack.id}`);
  }

  const recentSessions = await prisma.gameSession.findMany({
    where: { packId: pack.id, gmUserId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      code: true,
      status: true,
      createdAt: true,
      scenario: { select: { id: true, title: true } },
    },
  });

  return (
    <div className="space-y-5">
      <section className="border-b border-white/10 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="kicker text-emerald-300">Leader console</p>
            <h1 className="mt-2 font-[var(--font-display)] text-4xl font-black">{pack.title}</h1>
            <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-zinc-400">
              Выбери сценарий, отдай игроку ссылку и веди игру по подсказкам.
            </p>
          </div>
          <Link className="btn" href={`/packs/${pack.id}`}>
            К паку
          </Link>
        </div>
      </section>

      <LeaderConsole
        packId={pack.id}
        scenarios={pack.scenarios}
        recentSessions={recentSessions.map((s) => ({
          id: s.id,
          code: s.code,
          status: s.status,
          createdAt: s.createdAt.toISOString(),
          scenarioTitle: s.scenario?.title ?? null,
        }))}
      />
    </div>
  );
}
