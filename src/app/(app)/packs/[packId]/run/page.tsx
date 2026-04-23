import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeaderConsole } from "@/components/leader-console";

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
    <div className="space-y-4">
      <div className="card space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Leader Console</p>
            <h1 className="font-[var(--font-display)] text-3xl font-bold">{pack.title}</h1>
          </div>
          <Link className="btn" href={`/packs/${pack.id}`}>
            ← К паку
          </Link>
        </div>
        <p className="text-sm text-zinc-400">
          Режим ведущего: выбери сценарий, отдай игроку ссылку и веди игру по подсказкам.
        </p>
      </div>

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
